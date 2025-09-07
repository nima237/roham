FROM python:3.10

WORKDIR /app

# Install ODBC driver and dependencies for SQL Server
RUN apt-get update && apt-get install -y \
    gnupg2 \
    curl \
    ca-certificates \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-archive-keyring.gpg \
    && echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/debian/11/prod bullseye main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 msodbcsql17 unixodbc unixodbc-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy and install CA certificate
COPY certs/ca.crt /usr/local/share/ca-certificates/rh_tse_ca.crt
RUN update-ca-certificates

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=config.settings

# Create entrypoint script
RUN echo '#!/bin/bash\n\
python manage.py collectstatic --noinput\n\
python manage.py migrate\n\
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"] 