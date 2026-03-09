#!/bin/bash
set -e

AWS_REGION="us-east-1"
# Get ECR repository URI from AWS
ECR_REPO=$(aws ecr describe-repositories --region $AWS_REGION --repository-names qsoparty_repo --query 'repositories[0].repositoryUri' --output text)
EC2_INSTANCE_ID=$(aws ec2 describe-instances --region $AWS_REGION --filters "Name=tag:Name,Values=qsopartytracker-prod" "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].InstanceId" --output text)
IMAGE_TAG="latest"
CONTAINER_NAME="qsopartytracker"
GIT_SHA=$(git rev-parse --short HEAD)

# Build Docker image
docker build . --build-arg GIT_SHA=${GIT_SHA} --platform linux/amd64 -t ${ECR_REPO}:${GIT_SHA} -t ${ECR_REPO}:${IMAGE_TAG}

# Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

# Push image to ECR
docker push ${ECR_REPO}:${GIT_SHA}
docker push ${ECR_REPO}:${IMAGE_TAG}

# Tell EC2 to deploy the new image
aws ssm send-command \
    --region $AWS_REGION \
    --document-name "AWS-RunShellScript" \
    --targets "Key=instanceIds,Values=${EC2_INSTANCE_ID}" \
    --comment "Deploying new Docker image" \
    --parameters commands="[
        '/home/ec2-user/deploy-ec2 ${GIT_SHA}'
    ]"

echo "Deployment complete."
