# The Docker container is built using the Dockerfile in the project directory.
docker build -t auth-service -f docker/prod/Dockerfile .

# Run the Docker container for the Shiksha Dost Backend
docker run -d \
  -p 8000:8000 \
  --name auth-service-container \
  --env-file .env.development \
  auth-service:latest

# View the logs of the Docker container
docker logs -f name-container

# tag the docker image - DockerHub
docker tag name harmeet10000/name:latest
# for AWS ECR tag your image so you can push the image to this repository:
docker tag name:latest 050752605875.dkr.ecr.ap-south-1.amazonaws.com/name:latest

# push the docker image to docker hub
docker push harmeet10000/name:latest
# for AWS ECR push the image to this repository:
docker push 