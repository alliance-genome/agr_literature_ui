ifndef ENV_FILE
	ENV_FILE=.env
endif
include ${ENV_FILE}

COMPOSE_FILES = -f docker-compose.yml
ifneq ($(filter prod stage,$(REACT_APP_DEV_OR_STAGE_OR_PROD)),)
	COMPOSE_FILES += -f docker-compose.logging.yml
endif

restart-ui:
	/usr/bin/cp -f ${ENV_FILE} .env
	docker-compose $(COMPOSE_FILES) --env-file ${ENV_FILE} build ui
	docker-compose $(COMPOSE_FILES) --env-file ${ENV_FILE} rm -s -f ui
	docker-compose $(COMPOSE_FILES) --env-file ${ENV_FILE} up -d ui
