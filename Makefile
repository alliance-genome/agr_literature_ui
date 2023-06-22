
ifdef ENV_FILE
	include ${ENV_FILE}
else
	ENV_FILE=.env
endif

restart-ui:
	cp -f ${ENV_FILE} .env
	docker-compose --env-file ${ENV_FILE} build ui
	docker-compose --env-file ${ENV_FILE} rm -s -f ui
	docker-compose --env-file ${ENV_FILE} up -d ui
