# SAM build용 Makefile
# sam build 실행 시 각 함수별로 shared/ 모듈 복사
# ARTIFACTS_DIR 은 sam build가 자동으로 주입

build-DoctorApiFunction:
	cp lambdas/doctor_api/handler.py $(ARTIFACTS_DIR)/
	cp -r shared $(ARTIFACTS_DIR)/shared
	pip install -r lambdas/doctor_api/requirements.txt -t $(ARTIFACTS_DIR)/ --quiet

build-PatientApiFunction:
	cp lambdas/patient_api/handler.py $(ARTIFACTS_DIR)/
	cp -r shared $(ARTIFACTS_DIR)/shared
	pip install -r lambdas/patient_api/requirements.txt -t $(ARTIFACTS_DIR)/ --quiet

build-OrchestratorFunction:
	cp lambdas/orchestrator/handler.py $(ARTIFACTS_DIR)/
	cp -r shared $(ARTIFACTS_DIR)/shared
	pip install -r lambdas/orchestrator/requirements.txt -t $(ARTIFACTS_DIR)/ --quiet
