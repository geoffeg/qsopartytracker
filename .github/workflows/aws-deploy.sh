#!/bin/bash
set -e

# Variables (edit these)
AWS_REGION="us-east-1"
# Get ECR repository URI from AWS
ECR_REPO=$(aws ecr describe-repositories --region $AWS_REGION --repository-names qsoparty_repo --query 'repositories[0].repositoryUri' --output text)
EC2_INSTANCE_ID=$(aws ec2 describe-instances --region $AWS_REGION --filters "Name=tag:Name,Values=qsopartytracker-prod" "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].InstanceId" --output text)
IMAGE_TAG="latest"
CONTAINER_NAME="qsopartytracker"

# 1. Build Docker image
docker build . --build-arg GIT_SHA=$(git rev-parse --short HEAD) --platform linux/amd64 -t ${ECR_REPO}:${IMAGE_TAG}

# 2. Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

# 3. Push image to ECR
docker push ${ECR_REPO}:${IMAGE_TAG}


# 4. SSH into EC2 and deploy container
aws ssm send-command \
    --region $AWS_REGION \
    --document-name "AWS-RunShellScript" \
    --targets "Key=instanceIds,Values=${EC2_INSTANCE_ID}" \
    --comment "Deploying new Docker image" \
    --parameters commands="[
        'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO',
        'docker pull ${ECR_REPO}:${IMAGE_TAG}',
        'docker stop $CONTAINER_NAME || true',
        'docker rm $CONTAINER_NAME || true',
        'mkdir ~/docker-volumes || true',
        'docker run -d --name $CONTAINER_NAME --restart always -p 80:3000 --volume=/home/ec2-user/docker-volumes:/opt -e DB_PATH="/opt/aprs.db" -e CONFIG_PATH="/opt/config.js" ${ECR_REPO}:${IMAGE_TAG}'
    ]"

echo "Deployment complete."
