# Lightsail 배포 준비 정보

작성일: 2026-05-07

## 목적

이 문서는 `life_simulator`를 AWS Lightsail instance 한 대에 프론트엔드와 백엔드를 함께 배포하고, PostgreSQL은 Lightsail managed database를 사용하는 데 필요한 정보를 정리한다.

목표 운영 구조는 다음과 같다.

- Nginx가 80/443을 받는다.
- React/Vite 빌드 결과물은 Nginx 정적 파일로 제공한다.
- `/api/**` 요청은 같은 instance의 Spring Boot 백엔드 `127.0.0.1:8080`으로 reverse proxy한다.
- Spring Boot 백엔드는 managed PostgreSQL에 연결한다.
- managed database는 다른 서비스 테이블과 공유되므로 이 서비스의 테이블명에는 `life_simul_` prefix를 붙인다.

## 배포 전에 사용자에게 받아야 할 정보

### 1. Lightsail instance

- Instance name: `life-simulator`
- Instance status: `Running`
- AWS Region / Zone: Oregon, Zone A (`us-west-2a`)
- OS 버전
  - Ubuntu 24.04 LTS
- Public IPv4 주소: `35.164.88.121`
  - Static IP address
  - Static IP name: `life-simulator-ip`
- Private IPv4 주소: `172.26.12.45`
- Public IPv6 주소: `2600:1f14:1f51:7100:b2f5:d7f6:9d8b:cc5b`
- Networking type: Dual-stack
- SSH 사용자명: `ubuntu`
- SSH 접속 방식
  - Oregon (`us-west-2`) region의 Lightsail 기본 SSH key 사용
- instance plan
  - Type: General purpose
  - RAM: 2 GB
  - vCPU: 2
  - Disk: 60 GB SSD
  - Transfer: 3 TB
- Lightsail networking 방화벽 현재 상태
  - IPv4: `22/tcp` SSH open to any IPv4 address
  - IPv4: `80/tcp` HTTP open to any IPv4 address
  - IPv4: `443/tcp` HTTPS open to any IPv4 address
  - IPv6: `22/tcp` SSH open to any IPv6 address
  - IPv6: `80/tcp` HTTP open to any IPv6 address
  - IPv6: `443/tcp` HTTPS not open yet
- Static IP 연결 여부: attached
  - DNS A record는 `35.164.88.121`로 연결한다.

### 2. 도메인과 TLS

- 운영 도메인
  - `ai-miracle.cloud`
- `www` 또는 별도 subdomain 사용 여부
  - `www.ai-miracle.cloud` 사용
  - CNAME: `www` -> `ai-miracle.cloud.`
- DNS 관리 위치
  - 현재 도메인 구매처: 가비아
  - A record: `@` -> `35.164.88.121`
- DNS 레코드 변경 권한: 있음
- Let's Encrypt 인증서 발급용 이메일
  - `pokerface582@gmail.com`
  - `pokerface582@naver.com`
- HTTPS 적용 시점
  - 먼저 IP 기반 smoke test 후 적용
  - Static IP attach 및 DNS 연결 후 HTTPS 적용

권장 방식은 같은 origin 배포다.

- `https://ai-miracle.cloud/` -> React 정적 파일
- `https://ai-miracle.cloud/api/**` -> Spring Boot backend

이 방식이면 브라우저 CORS 문제가 거의 없다. 프론트엔드가 백엔드를 별도 origin으로 직접 호출하는 구조를 선택하면 `backend/src/main/java/com/lifesimulator/backend/config/CorsConfig.java` 수정이 필요하다.

### 3. Managed PostgreSQL

- DB host 또는 endpoint
  - `ls-31e4a37921c73fa8b7c4d5f956f1c42b4fbe814d.cho44ekq05hu.us-west-2.rds.amazonaws.com`
- DB port: `5432`
- database name: `life_simulator`
  - 배포 중 managed PostgreSQL instance 안에 생성함.
- username: `dbmasteruser`
- password: 문서에 저장하지 않음. 서버의 `/etc/life-simulator/backend.env`에만 저장한다.
- SSL 요구 여부
  - 운영 JDBC URL에 `?sslmode=require`를 붙인다.
- Lightsail instance에서 managed database 접근이 허용되어 있는지: 확인됨
- DB user 권한
  - `dbmasteruser` 사용
  - master user이므로 migration/table 생성 권한은 충분한 것으로 본다.
  - 최소 필요: `CREATE TABLE`, `CREATE INDEX`, `ALTER`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- 기존 다른 서비스와 같은 managed database instance를 공유하는지: 예
  - 이 서비스는 `life_simulator` database 안의 `public.life_simul_*` 테이블 prefix와 `life_simul_flyway_schema_history`를 사용한다.
- 별도 schema를 만들 수 있는지
  - 사용자는 테이블 prefix 방식을 요청했으므로 기본 계획은 `public.life_simul_*` 테이블명 사용이다.

## DB prefix 요구사항

현재 백엔드는 Spring JDBC와 Flyway를 사용하고, SQL 안에 테이블명이 직접 들어 있다. 따라서 `life_simul_` prefix는 환경변수 하나로 적용되지 않는다.

배포 전에 migration SQL과 Java SQL이 아래 이름으로 맞춰져 있어야 한다.

### 변경해야 하는 테이블

운영 DB에서는 아래 이름으로 생성/조회해야 한다.

- `life_simul_request_logs`
- `life_simul_stage_logs`
- `life_simul_guardrail_events`
- `life_simul_anomaly_events`
- `life_simul_drift_daily_metrics`
- `life_simul_model_usage_daily`
- `life_simul_eval_samples`

### 변경해야 하는 Flyway metadata table

공유 DB에서 기본 `flyway_schema_history`를 사용하면 다른 서비스의 Flyway 이력과 충돌할 수 있다.

운영에서는 Flyway metadata table도 분리해야 한다.

- 권장 이름: `life_simul_flyway_schema_history`

이를 위해 `backend/src/main/java/com/lifesimulator/backend/database/DatabaseMigrationRunner.java`에서 Flyway 설정에 table name 지정이 필요하다.
공유 DB가 이미 다른 서비스 테이블을 가지고 있어도 이 서비스의 V1 migration이 실행되도록 baseline version은 `0`으로 둔다.

### 관련 파일

- `backend/src/main/resources/db/migration/V1__init_llmops.sql`
- `backend/src/main/java/com/lifesimulator/backend/logging/SimulationLogRepository.java`
- `backend/src/main/java/com/lifesimulator/backend/monitoring/MonitoringRepository.java`
- `backend/src/main/java/com/lifesimulator/backend/worker/BackendWorkerService.java`
- `backend/src/main/java/com/lifesimulator/backend/database/DatabaseMigrationRunner.java`

주의: DB prefix 리팩토링이 반영되지 않은 revision에서 `BACKEND_DATABASE_ENABLED=true`와 `BACKEND_DATABASE_MIGRATE=true`로 운영 DB에 연결하면 이전 이름의 테이블과 기본 `flyway_schema_history`가 생성될 수 있다.

## Backend runtime 설정

이 프로젝트 백엔드는 Java 21을 사용한다.

- 확인 위치: `backend/pom.xml`
- 운영 서버 필요 패키지:
  - OpenJDK 21
  - Nginx
  - Certbot 및 `python3-certbot-nginx`
  - PostgreSQL client
  - Git, Node.js 22 이상, npm은 서버에서 source build를 수행할 때만 필요하다.

운영 환경변수 예시는 아래와 같다. 실제 secret 값은 문서나 Git에 저장하지 않는다.

```sh
BACKEND_DATABASE_ENABLED=true
BACKEND_DATABASE_URL=jdbc:postgresql://ls-31e4a37921c73fa8b7c4d5f956f1c42b4fbe814d.cho44ekq05hu.us-west-2.rds.amazonaws.com:5432/life_simulator?sslmode=require
BACKEND_DATABASE_USERNAME=dbmasteruser
BACKEND_DATABASE_PASSWORD=<set-in-/etc/life-simulator/backend.env>
BACKEND_DATABASE_MIGRATE=true

SIMULATOR_LLM_PROVIDER=openai
OPENAI_API_KEY=<set-in-/etc/life-simulator/backend.env>
SIMULATOR_OPENAI_MODEL=gpt-5.4-mini
SIMULATOR_OPENAI_TIMEOUT=75s

SIMULATOR_RATE_LIMIT_USE_FORWARDED_HEADERS=true
BACKEND_ASYNC_REQUEST_TIMEOUT=300s
```

AWS 같은 서버 배포에서는 `SIMULATOR_LLM_PROVIDER=openai`를 기본으로 본다. `codex` 모드는 서버에 Codex CLI 설치와 subscription authentication이 별도로 필요하므로 운영 기본값으로 두지 않는다.

## Frontend build 설정

프론트엔드는 Vite React SPA다.

운영 빌드 시 `VITE_API_BASE_URL`을 운영 origin으로 지정한다.

```sh
VITE_API_BASE_URL=https://ai-miracle.cloud npm run build
```

도메인 적용 전 IP 기반 smoke test를 할 경우:

```sh
VITE_API_BASE_URL=http://35.164.88.121 npm run build
```

Nginx가 같은 origin에서 `/api/**`를 백엔드로 proxy하면 브라우저는 `https://ai-miracle.cloud/api/...`로 요청한다.

## 서버 배포 방식 결정

아래 중 하나를 선택해야 한다.

### A. 서버에서 Git clone 후 빌드

필요 정보:

- Git repository URL
- branch name
- private repository인 경우 deploy key 또는 access token

장점:

- 서버에서 재배포가 단순하다.
- 변경 이력이 명확하다.

주의:

- 서버에 Node.js, npm, JDK, Maven 의존성 다운로드가 필요하다.
- 작은 Lightsail instance에서는 빌드 중 메모리 부족이 날 수 있다.

### B. 로컬에서 빌드 후 artifact 업로드

필요 정보:

- SSH/SCP 접속 정보
- 업로드 대상 경로

장점:

- 서버 자원 사용이 적다.
- 운영 서버에 빌드 도구를 최소화할 수 있다.

주의:

- artifact 버전 관리와 재배포 절차를 명확히 해야 한다.

## 권장 서버 경로

운영 경로 예시:

- 앱 루트: `/opt/life-simulator`
- 백엔드 JAR: `/opt/life-simulator/backend/life-simulator-backend.jar`
- 프론트엔드 정적 파일: `/var/www/life-simulator`
- 백엔드 환경 파일: `/etc/life-simulator/backend.env`
- systemd service: `/etc/systemd/system/life-simulator-backend.service`
- Nginx site config: `/etc/nginx/sites-available/life-simulator`

## systemd 구성에 필요한 결정

- 백엔드 실행 사용자
  - 예: `life-simulator`
- 백엔드 포트
  - 기본: `8080`
- restart 정책
  - 권장: `Restart=on-failure`
- 로그 확인 방식
  - `journalctl -u life-simulator-backend`

## Nginx 구성에 필요한 결정

- 운영 도메인: `ai-miracle.cloud`
- 정적 파일 root: `/var/www/life-simulator`
- `/api/` proxy 대상
  - 기본: `http://127.0.0.1:8080`
- 업로드/응답 크기 제한 필요 여부
- proxy timeout
  - simulation 요청이 길 수 있으므로 300초 수준 권장

## 배포 전 로컬 검증

코드 변경 후 최소 검증:

```sh
cd backend && ./mvnw test
cd frontend && npm run typecheck
cd frontend && npm run build
```

DB prefix 변경 후에는 managed DB에 바로 적용하기 전에 가능하면 임시 PostgreSQL에서 migration smoke test를 먼저 수행한다.

## 배포 후 smoke test

서버에서 확인:

```sh
curl -f http://127.0.0.1:8080/actuator/health
curl -f http://127.0.0.1:8080/api/cases
```

외부에서 확인:

```sh
curl -f https://ai-miracle.cloud/api/cases
curl -I https://ai-miracle.cloud/
```

브라우저 확인:

- 첫 화면 로딩
- 케이스 목록 로딩
- simulation API 요청
- rate limit 동작
- 백엔드 로그에 DB insert 오류가 없는지
- managed DB에 `life_simul_*` 테이블만 생성되었는지

## 현재 배포 상태

- URL: `https://ai-miracle.cloud/`
- `www.ai-miracle.cloud`는 `https://ai-miracle.cloud/`로 301 redirect한다.
- Backend service: `life-simulator-backend`
- Backend health: `http://127.0.0.1:8080/actuator/health` 200 확인
- External API: `https://ai-miracle.cloud/api/cases` 200 확인
- Let's Encrypt certificate
  - Domains: `ai-miracle.cloud`, `www.ai-miracle.cloud`
  - Expiry: 2026-08-04
- DB migration 결과
  - `life_simul_flyway_schema_history`
  - `life_simul_request_logs`
  - `life_simul_stage_logs`
  - `life_simul_guardrail_events`
  - `life_simul_anomaly_events`
  - `life_simul_drift_daily_metrics`
  - `life_simul_model_usage_daily`
  - `life_simul_eval_samples`

## Worker job 운영 여부

현재 백엔드에는 worker job 진입점이 있다.

- `log`: inline persistence라 compatibility no-op
- `drift`: DB 필요
- `eval`: DB 필요

운영에서 `drift`와 `eval`을 주기적으로 돌릴지 결정해야 한다. 필요하면 systemd timer 또는 cron으로 구성한다.

## 최종 체크리스트

- [x] Lightsail public IP 확보
- [x] SSH 접속 확인
- [x] Static IP 연결
- [x] 80/443 방화벽 오픈
- [x] 도메인 DNS 연결
- [x] managed PostgreSQL endpoint 확인
- [x] DB user 권한 확인
- [x] `life_simul_` table prefix 코드 반영
- [x] Flyway metadata table을 `life_simul_flyway_schema_history`로 분리
- [x] OpenAI API key 또는 LLM 실행 방식 확정
- [x] 프론트엔드 `VITE_API_BASE_URL` 확정
- [x] 백엔드 systemd service 작성
- [x] Nginx reverse proxy 작성
- [x] HTTPS 인증서 발급
- [x] `/actuator/health` 확인
- [x] `/api/cases` 확인
- [ ] 프론트엔드 화면 확인
- [ ] simulation 요청 확인
- [x] DB에 prefixed table만 생성되었는지 확인

## 남은 위험

- OpenAI API key, 모델 접근 권한, 과금 한도에 따라 simulation 요청이 실패할 수 있다.
- 작은 Lightsail plan에서는 frontend/backend 빌드 또는 긴 simulation 요청 중 메모리 부족이 발생할 수 있다.
- managed PostgreSQL이 다른 서비스와 schema를 공유하므로 prefix 변경 전 migration을 실행하면 테이블 충돌 또는 불필요한 unprefixed 테이블이 생길 수 있다.
- Codex CLI 모드는 서버 인증과 CLI 설치가 필요하므로 운영에서는 OpenAI API 모드를 우선한다.
