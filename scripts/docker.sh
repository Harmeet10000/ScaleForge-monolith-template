# The Docker container is built using the Dockerfile in the project directory.
 docker build -t auth-service -f docker/dev.Dockerfile .

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

# push the docker image to docker hub
docker push harmeet10000/auth-service:latest
# for AWS ECR push the image to this repository:
docker push

#Run Loki Docker container
docker run -d --name loki -v $(pwd):/mnt/config -p 3100:3100 grafana/loki:2.8.0 --config.file=/mnt/config/loki-config.yaml

#Run Promtail Docker container
docker run -d --name promtail -v $(pwd):/mnt/config -v /var/log:/var/log --link loki grafana/promtail:2.8.0 --config.file=/mnt/config/promtail-config.yaml

# Run Prometheus Docker container
docker run -d --name=prometheus -p 9090:9090 -v <PATH_TO_prometheus.yml_FILE>:/etc/prometheus/prometheus.yml prom/prometheus --config.file=/etc/prometheus/prometheus.yml

