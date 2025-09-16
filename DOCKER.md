# Docker Setup dla Form Builder

## Szybki Start

### 1. Uruchomienie z domyślną konfiguracją
```bash
# Uruchom usługi w trybie rozwojowym
./start-docker.sh

# Lub użyj docker-compose bezpośrednio
docker-compose up --build -d
```

### 2. Uruchomienie w trybie produkcyjnym
```bash
# Uruchom z konfiguracją produkcyjną
./start-docker.sh prod

# Lub użyj docker-compose bezpośrednio
docker-compose -f docker-compose.prod.yml up --build -d
```

## Konfiguracja

### Zmienne środowiskowe

Skopiuj plik `.env.docker` do `.env` i dostosuj następujące zmienne:

```env
# Baza danych PostgreSQL
POSTGRES_DB=formbuilder
POSTGRES_USER=formbuilder_user
POSTGRES_PASSWORD=formbuilder_password123

# Aplikacja
SESSION_SECRET=your_secure_session_secret_change_this_in_production
APP_PORT=5000
```

### Struktura usług

- **postgres**: Baza danych PostgreSQL 15
- **app**: Aplikacja Form Builder (Node.js + React)

## Dostęp do aplikacji

Po uruchomieniu:
- **Aplikacja**: http://localhost:5000
- **Baza danych**: localhost:5432
- **Domyślne logowanie**: admin / Procesy123

## Komendy Docker

### Podstawowe operacje
```bash
# Uruchomienie usług
docker-compose up -d

# Zatrzymanie usług
docker-compose down

# Przebudowanie i uruchomienie
docker-compose up --build -d

# Sprawdzenie statusu
docker-compose ps

# Wyświetlenie logów
docker-compose logs -f

# Wyświetlenie logów konkretnej usługi
docker-compose logs -f app
docker-compose logs -f postgres
```

### Zarządzanie danymi
```bash
# Zatrzymanie z usunięciem danych
./stop-docker.sh --volumes

# Kompletne czyszczenie
./stop-docker.sh --clean

# Backup bazy danych
docker-compose exec postgres pg_dump -U formbuilder_user formbuilder > backup.sql

# Przywracanie bazy danych
docker-compose exec -T postgres psql -U formbuilder_user formbuilder < backup.sql
```

## Volumes

- `postgres_data`: Dane bazy PostgreSQL
- `app_uploads`: Przesłane pliki
- `app_backups`: Kopie zapasowe formularzy

## Rozwiązywanie problemów

### Sprawdzenie zdrowia usług
```bash
# Status wszystkich kontenerów
docker-compose ps

# Szczegółowe informacje o zdrowiu
docker inspect $(docker-compose ps -q app) | grep -A 10 "Health"
```

### Połączenie z bazą danych
```bash
# Wejście do kontenera PostgreSQL
docker-compose exec postgres psql -U formbuilder_user -d formbuilder

# Sprawdzenie połączenia z aplikacji
docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"
```

### Migracje bazy danych
```bash
# Uruchomienie migracji ręcznie
docker-compose exec app npm run db:push
```

## Bezpieczeństwo

### Produkcja

1. **Zmień domyślne hasła**:
   - `POSTGRES_PASSWORD`
   - `SESSION_SECRET`

2. **Użyj HTTPS** - skonfiguruj reverse proxy (nginx/traefik)

3. **Backup bazy danych** - regularnie wykonuj kopie zapasowe

4. **Monitorowanie** - dodaj monitoring kontenerów

### Zmienne środowiskowe dla produkcji
```env
NODE_ENV=production
SESSION_SECRET=bardzo_długi_i_bezpieczny_klucz_sesji
POSTGRES_PASSWORD=bardzo_silne_hasło_bazy_danych
```