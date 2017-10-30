rmdir "bin" /s /q
docker build --no-cache -f Dockerfile.build -t one-setia-service:build .
docker rm one-setia-service-build-container
docker create --name one-setia-service-build-container one-setia-service:build
md bin
docker cp one-setia-service-build-container:/out ./bin/publish
docker build --no-cache -f Dockerfile -t one-setia-service:latest .