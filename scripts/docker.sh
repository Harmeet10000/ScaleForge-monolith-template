# The Docker container is built using the Dockerfile in the project directory.
 
# Run the Docker container for the Shiksha Dost Backend
docker run -d \
  -p 8000:8000 \
  --name auth-service-container \
  --env-file .env.development \
  auth-service:latest

# View the logs of the Docker container
docker logs -f auth-service-container

# tag the docker image - DockerHub
docker tag auth-service harmeet10000/auth-service:latest
# for AWS ECR tag your image so you can push the image to this repository:
docker tag auth-service:latest 050752605875.dkr.ecr.ap-south-1.amazonaws.com/auth-service:latest

# push the docker image to docker hub
docker push harmeet10000/auth-service:latest
# for AWS ECR push the image to this repository:
docker push 