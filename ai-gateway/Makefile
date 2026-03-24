DEV_IMAGE_NAME := europe-west3-docker.pkg.dev/claw-now-dev/clawnow-dev/ai-gateway:latest
PROD_IMAGE_NAME := europe-west3-docker.pkg.dev/claw-now-prod/clawnow-prod/ai-gateway:latest

build:
	docker build --platform linux/amd64 -t $(DEV_IMAGE_NAME) -t $(PROD_IMAGE_NAME) -f Dockerfile ..
	
push-dev: build
	docker push $(DEV_IMAGE_NAME)

push-prod: build
	docker push $(PROD_IMAGE_NAME)