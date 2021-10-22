FROM debian:buster-slim

# Install dependencies
RUN set -ex; \
    apt-get -qq update && \
    apt-get -qq -y --no-install-recommends install supervisor zip cpuid cron curl nodejs npm wget \
    libxinerama1 libfontconfig1 libdbus-glib-1-2 libcairo2 libcups2 libglu1-mesa libsm6 fonts-wqy-zenhei && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install libreoffice (dependencie for carbone)
RUN wget -q https://downloadarchive.documentfoundation.org/libreoffice/old/6.4.5.2/deb/x86_64/LibreOffice_6.4.5.2_Linux_x86-64_deb.tar.gz && \
    tar -zxvf LibreOffice_6.4.5.2_Linux_x86-64_deb.tar.gz && \
    dpkg -i ./LibreOffice_6.4.5.2_Linux_x86-64_deb/DEBS/*.deb && \
    rm -rf LibreOffice_6.4.5.2_Linux_x86-64_deb

# Install carbone
RUN npm install -g @keepsolutions/carbone@2.1.1-6
