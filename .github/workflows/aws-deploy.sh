#!/bin/bash
set -e

# Variables (edit these)
AWS_REGION="us-east-1"
# Get ECR repository URI from AWS
ECR_REPO=$(aws ecr describe-repositories --region $AWS_REGION --repository-names qsoparty_repo --query 'repositories[0].repositoryUri' --output text)
EC2_INSTANCE_ID=$(aws ec2 describe-instances --region $AWS_REGION --filters "Name=tag:Name,Values=qsopartytracker-prod" "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].InstanceId" --output text)
IMAGE_TAG="latest"
CONTAINER_NAME="qsopartytracker"

# Build Docker image
docker build . --build-arg GIT_SHA=$(git rev-parse --short HEAD) --platform linux/amd64 -t ${ECR_REPO}:${IMAGE_TAG}

# Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

# Push image to ECR
docker push ${ECR_REPO}:${IMAGE_TAG}

SECRETS_FILE_BASE64=$(base64 -w 0 secrets/.env.prod.sops)
# Copy the encrypted config file to the EC2 instance using SSM
aws ssm send-command \
    --region $AWS_REGION \
    --document-name "AWS-RunShellScript" \
    --targets "Key=instanceIds,Values=${EC2_INSTANCE_ID}" \
    --comment "Copying encrypted config file" \
    --parameters commands="[
        'echo ${SECRETS_FILE_BASE64} | base64 -d > /home/ec2-user/env.enc',
    ]"

# SSH into EC2 and deploy container
aws ssm send-command \
    --region $AWS_REGION \
    --document-name "AWS-RunShellScript" \
    --targets "Key=instanceIds,Values=${EC2_INSTANCE_ID}" \
    --comment "Deploying new Docker image" \
    --parameters commands="[
        'sudo SOPS_AGE_KEY_FILE=/etc/age/age-key.txt /usr/local/bin/sops --decrypt --input-type dotenv --output-type dotenv /home/ec2-user/env.enc > /data/.env',
        'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO',
        'docker pull ${ECR_REPO}:${IMAGE_TAG}',
        'docker stop $CONTAINER_NAME || true',
        'docker rm $CONTAINER_NAME || true',
        'mkdir ~/docker-volumes || true',
        'docker run -d --name $CONTAINER_NAME --restart always -p 80:3000 --volume=/data/:/opt --env-file /data/.env ${ECR_REPO}:${IMAGE_TAG}'
    ]"

echo "Deployment complete."
