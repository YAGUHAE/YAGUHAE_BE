# `nginx/ssl/`

`default.conf`가 이 디렉터리를 `include /etc/nginx/ssl-conf/*.conf`로 읽는다. 컨테이너 안에서는 `/etc/nginx/ssl-conf` 로 마운트된다 — `conf.d` 하위가 아닌 이유는 `conf.d` 가 읽기 전용 마운트라 그 안쪽에 또 마운트하면 nginx 컨테이너가 기동에 실패하기 때문이다.

- **`.conf` 파일이 없으면** glob이 아무것도 매칭하지 않고 nginx는 평소대로 80만 듣는다. 도메인·인증서가 없는 지금이 이 상태다.
- **인증서 발급 후** `api-ssl.conf.example`을 `api-ssl.conf`로 복사하고 `${DOMAIN}`을 실제 도메인으로 치환하면 443이 열린다.

인증서 파일이 없는 상태에서 `.conf`로 두면 **nginx가 기동에 실패해 서비스 전체가 멈춘다.** 반드시 발급을 먼저 끝내고 이름을 바꾼다.

전체 절차는 `docs/배포 가이드.md`의 "HTTPS로 전환하기"를 따른다.
