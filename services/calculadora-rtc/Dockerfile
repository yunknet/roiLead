# Calculadora de Tributos da Reforma Tributária (CBS/IBS/IS)
# Motor oficial e aberto da Receita Federal (licença MIT):
#   https://github.com/ReceitaFederal/calculadora-rtc-regime-regular
#
# A versão usada fica no arquivo VERSAO (uma tag do repositório da Receita).
# O workflow .github/workflows/calculadora-rtc-atualizar.yml troca essa versão
# sozinho quando a Receita publica uma nova e os testes passam.
#
# No Easypanel: App > Source GitHub, branch de produção,
# Build Path: /services/calculadora-rtc   (Dockerfile)   Porta interna: 8080

FROM maven:3.9-eclipse-temurin-25 AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY VERSAO /tmp/VERSAO
RUN VERSAO="$(tr -d ' \r\n' < /tmp/VERSAO)" \
 && git -c advice.detachedHead=false clone --depth 1 --branch "$VERSAO" \
      https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git .

# Banco SQLite com as tabelas oficiais (NCM, NBS, CST, cClassTrib, alíquotas...)
RUN mkdir -p calculadora/db \
 && mvn -q flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf --batch-mode --errors
RUN mvn -q -DskipTests --batch-mode package \
 && cp target/api-regime-geral.jar /app.jar

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app.jar /app/app.jar
COPY --from=build /src/calculadora/db /app/calculadora/db
COPY --from=build /src/LICENSE /app/LICENSE-receita-federal.txt
COPY VERSAO /app/VERSAO
# Limita a memória para conviver com os outros serviços da VPS.
ENV JAVA_OPTS="-Xms64m -Xmx448m -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
CMD ["sh", "-c", "exec java $JAVA_OPTS -Dspring.profiles.active=offline -jar /app/app.jar"]
