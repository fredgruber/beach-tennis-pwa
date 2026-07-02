# 🏖️ Arena BT Brothers — Plataforma de Torneios de Beach Tennis

<div align="center">

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.0-6DB33F?style=for-the-badge&logo=spring-boot)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)

**Plataforma completa para organização e acompanhamento de torneios de beach tennis.**  
Suporta dois formatos: **Dupla Fixa** e **Rei da Praia** — com classificação por GP, Vitórias e Saldo de Games.

[🚀 Início Rápido](#-início-rápido) · [📡 API Reference](#-api-reference) · [🐳 Docker](#-deploy-com-docker) · [🏆 Modos de Torneio](#-modos-de-torneio)

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológica](#-stack-tecnológica)
- [Início Rápido](#-início-rápido)
- [Modos de Torneio](#-modos-de-torneio)
- [API Reference](#-api-reference)
- [Deploy com Docker](#-deploy-com-docker)
- [Estrutura do Projeto](#-estrutura-do-projeto)

---

## 🎯 Sobre o Projeto

A **Arena BT Brothers** é uma Progressive Web App (PWA) desenvolvida para gerenciar torneios de beach tennis de forma simples e eficiente. A aplicação oferece:

- Cadastro e gestão de jogadores
- Criação de torneios em dois formatos distintos
- Registro de placares das partidas
- Classificação automática com critérios de desempate (GP → Vitórias → Saldo de Games)
- Interface responsiva, instalável como app no celular (PWA)
- Banco de dados persistente — sem perda de dados ao reiniciar

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 👤 **Cadastro de Jogadores** | Crie e gerencie o cadastro de todos os jogadores |
| 🏆 **Torneio Dupla Fixa** | Cada dupla joga contra todas as outras (todos contra todos) |
| 👑 **Rei da Praia** | Sistema de rodízio onde as duplas são formadas dinamicamente |
| 📊 **Classificação em Tempo Real** | Tabela atualizada automaticamente após cada resultado |
| 🔢 **Critérios de Desempate** | Ordenação por GP → Vitórias → Saldo de Games (SG) |
| 📱 **PWA Instalável** | Funciona offline e pode ser instalado como app nativo |
| 🗄️ **Persistência de Dados** | Banco PostgreSQL (Neon) — dados persistentes em nuvem |

---

## 🛠️ Stack Tecnológica

### Backend
- **Java 21** — LTS com virtual threads
- **Spring Boot 4.1.0** — Framework principal
- **Spring Data JPA** — Persistência de dados
- **Neon (PostgreSQL)** — Banco de dados em nuvem (ou H2 para desenvolvimento local)
- **Gradle** — Build tool

### Frontend
- **HTML5 / CSS3 / JavaScript** — Puro, sem frameworks
- **PWA** — Service Worker + Web App Manifest
- **Design Responsivo** — Otimizado para mobile e desktop

### Infraestrutura
- **Docker** — Containerização
- **Docker Compose** — Orquestração local (dev e prod)
- **OCI Container Instance** — Deploy na nuvem (Oracle Cloud)

---

## 🚀 Início Rápido

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado

### Subir em desenvolvimento (1 comando)

```bash
./dev.sh
```

A aplicação estará disponível em:
- 🌐 **App:** http://localhost:8080
- 🗄️ **H2 Console (Local):** http://localhost:8080/h2-console

> **JDBC URL para H2 Console (Local):** `jdbc:h2:file:./data/beachtennis`
> **Produção:** Conecta automaticamente ao banco de dados relacional **Neon (PostgreSQL)** na nuvem.

### Subir manualmente com Docker Compose

```bash
# Clonar o repositório
git clone https://github.com/fredgruber/beach-tennis-pwa.git
cd beach-tennis-pwa

# Criar pasta de dados e subir
mkdir -p data
docker compose up --build -d

# Verificar logs
docker compose logs -f
```

---

## 🏆 Modos de Torneio

### 🤝 Dupla Fixa
Torneio em que as duplas são formadas previamente e jogam contra todas as outras (sistema de pontos corridos).

- Ideal para grupos com duplas já definidas
- Cada dupla enfrenta todas as outras exatamente uma vez
- Classificação por: **GP → Vitórias → Saldo de Games**

### 👑 Rei da Praia
Sistema de rodízio onde as duplas são reorganizadas dinamicamente entre as rodadas.

- Duplas formadas para cada rodada
- Ganhadores sobem de quadra, perdedores descem
- Ranking individual ao final do torneio

---

## 📡 API Reference

### Jogadores

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/players` | Lista todos os jogadores |
| `POST` | `/api/players` | Cadastra um novo jogador |
| `POST` | `/api/players/import` | Importa múltiplos jogadores em lote |
| `DELETE` | `/api/players/{id}` | Remove um jogador |

**Exemplo — Criar jogador:**
```bash
curl -X POST http://localhost:8080/api/players \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva"}'
```

**Exemplo — Importar jogadores em lote:**
```bash
curl -X POST http://localhost:8080/api/players/import \
  -H "Content-Type: application/json" \
  -d '[{"name": "João"}, {"name": "Maria"}, {"name": "Pedro"}]'
```

---

### Torneios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/tournaments` | Lista todos os torneios |
| `GET` | `/api/tournaments/{id}` | Busca torneio por ID |
| `POST` | `/api/tournaments/dupla-fixa` | Cria torneio Dupla Fixa |
| `POST` | `/api/tournaments/rei-da-praia` | Cria torneio Rei da Praia |
| `GET` | `/api/tournaments/{id}/matches` | Lista as partidas do torneio |
| `GET` | `/api/tournaments/{id}/standings` | Classificação do torneio |
| `PUT` | `/api/tournaments/matches/{matchId}` | Atualiza placar de uma partida |
| `DELETE` | `/api/tournaments/{id}` | Exclui um torneio |

**Exemplo — Criar torneio Dupla Fixa:**
```bash
curl -X POST http://localhost:8080/api/tournaments/dupla-fixa \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Torneio Junho 2026",
    "teams": [[1, 2], [3, 4], [5, 6]]
  }'
```
> `teams` é uma lista de duplas, onde cada dupla contém os IDs dos dois jogadores.

**Exemplo — Criar torneio Rei da Praia:**
```bash
curl -X POST http://localhost:8080/api/tournaments/rei-da-praia \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rei da Praia — Julho",
    "playerIds": [1, 2, 3, 4, 5, 6, 7, 8]
  }'
```

**Exemplo — Registrar placar:**
```bash
curl -X PUT http://localhost:8080/api/tournaments/matches/42 \
  -H "Content-Type: application/json" \
  -d '{"score1": 6, "score2": 4}'
```

**Exemplo — Ver classificação:**
```bash
curl http://localhost:8080/api/tournaments/1/standings
```

---

## 🐳 Deploy com Docker

### Build da Imagem

```bash
# Build local (sem push)
./deploy.sh

# Build com tag específica
./deploy.sh --tag v1.0.0

# Build e push para registry (OCI, Docker Hub, etc.)
REGISTRY=gru.ocir.io/mytenancy/beach-tennis-pwa ./deploy.sh --push --tag v1.0.0
```

### Produção Local

```bash
# Subir com docker-compose de produção
docker compose -f docker-compose.prod.yml up -d

# Parar
docker compose -f docker-compose.prod.yml down
```

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `default` | Profile do Spring (`default` ou `prod`) |
| `JAVA_OPTS` | `-Xmx512m -Xms256m` | Opções da JVM |
| `REGISTRY` | *(vazio)* | URL do registry Docker para push |
| `IMAGE_TAG` | `latest` | Tag da imagem Docker |
| `DOCKER_IMAGE` | `beach-tennis-pwa` | Nome da imagem no docker-compose.prod.yml |

### Deploy no OCI Container Instance

```bash
# 1. Autenticar no OCIR
docker login gru.ocir.io

# 2. Build e push
REGISTRY=gru.ocir.io/<tenancy>/<namespace>/beach-tennis-pwa \
  ./deploy.sh --push --tag v1.0.0

# 3. Configurar Container Instance no OCI Console
#    Porta: 8080
#    Variável: SPRING_PROFILES_ACTIVE=prod
```

---

## 📁 Estrutura do Projeto

```
beach-tennis-pwa/
├── src/
│   └── main/
│       ├── java/com/beachtennis/
│       │   ├── controller/
│       │   │   ├── PlayerController.java       # Endpoints de jogadores
│       │   │   └── TournamentController.java   # Endpoints de torneios
│       │   ├── model/
│       │   │   ├── Player.java                 # Entidade Jogador
│       │   │   ├── Team.java                   # Entidade Dupla
│       │   │   ├── Tournament.java             # Entidade Torneio
│       │   │   ├── TournamentMatch.java        # Entidade Partida
│       │   │   ├── TournamentType.java         # Enum: DUPLA_FIXA | REI_DA_PRAIA
│       │   │   ├── TournamentStatus.java       # Enum: ACTIVE | FINISHED
│       │   │   └── MatchStatus.java            # Enum: PENDING | COMPLETED
│       │   ├── repository/
│       │   │   ├── PlayerRepository.java
│       │   │   ├── TeamRepository.java
│       │   │   ├── TournamentRepository.java
│       │   │   └── TournamentMatchRepository.java
│       │   ├── service/
│       │   │   └── TournamentService.java      # Lógica de negócio
│       │   └── dto/
│       │       ├── PlayerStanding.java         # DTO de classificação individual
│       │       └── TeamStanding.java           # DTO de classificação por dupla
│       └── resources/
│           ├── application.properties          # Config desenvolvimento (H2)
│           ├── application-prod.properties     # Config produção (Neon PostgreSQL)
│           └── static/
│               ├── index.html                  # Interface principal (PWA)
│               ├── manifest.json               # Web App Manifest
│               ├── sw.js                       # Service Worker (offline)
│               ├── css/style.css
│               ├── js/app.js
│               └── icons/                      # Ícones PWA (192x192, 512x512)
├── data/                                       # Banco H2 local de desenvolvimento (gitignore)
├── Dockerfile                                  # Imagem de produção multi-stage
├── docker-compose.yml                          # Desenvolvimento local
├── docker-compose.prod.yml                     # Produção
├── dev.sh                                      # Script de desenvolvimento
├── deploy.sh                                   # Script de build/push
└── build.gradle                                # Dependências e build
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas alterações: `git commit -m 'feat: adiciona minha feature'`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob licença privada — **Arena BT Brothers** © 2026.

---

<div align="center">
  Feito com ❤️ para a comunidade de Beach Tennis 🏖️
</div>
