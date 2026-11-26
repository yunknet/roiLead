# Calculadora de Tributos da Reforma Tributária — SIMPLES NACIONAL (CBS/IBS)
# Motor oficial e aberto da Receita Federal (licença MIT):
#   https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional
#
# VERSAO        = tag do motor do Simples Nacional
# VERSAO_BANCO  = tag do repositório do regime regular, de onde vêm as tabelas oficiais
#                 (o próprio projeto da Receita manda gerar o banco a partir dele)
# O workflow .github/workflows/calculadora-rtc-atualizar.yml atualiza as duas sozinho.
#
# No Easypanel: App > Source GitHub, branch de produção,
# Build Path: /services/calculadora-rtc-simples   (Dockerfile)   Porta interna: 8082

FROM maven:3.9-eclipse-temurin-25 AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
COPY VERSAO VERSAO_BANCO /tmp/

# 1) Banco SQLite com as tabelas oficiais, gerado pelos scripts do regime regular
WORKDIR /banco
RUN git -c advice.detachedHead=false clone --depth 1 --branch "$(tr -d ' \r\n' < /tmp/VERSAO_BANCO)" \
      https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git . \
 && mkdir -p calculadora/db \
 && mvn -q flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf --batch-mode --errors

# 2) Motor do Simples Nacional
WORKDIR /src
RUN git -c advice.detachedHead=false clone --depth 1 --branch "$(tr -d ' \r\n' < /tmp/VERSAO)" \
      https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional.git . \
 && mvn -q -DskipTests --batch-mode package \
 && cp target/api-simples-nacional.jar /app.jar

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app.jar /app/app.jar
COPY --from=build /banco/calculadora/db /app/calculadora/db
COPY --from=build /src/LICENSE /app/LICENSE-receita-federal.txt
COPY VERSAO VERSAO_BANCO /app/
ENV JAVA_OPTS="-Xms64m -Xmx448m -XX:+UseSerialGC -Xss512k"
EXPOSE 8082
CMD ["sh", "-c", "exec java $JAVA_OPTS -Dspring.profiles.active=offline -jar /app/app.jar"]
