FROM debian:stable
# Packages needed for chromium and add a conf line in pulse
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
      chromium \
      chromium-sandbox \
      chromium-l10n \
      fonts-liberation \
      fonts-roboto \
      hicolor-icon-theme \
      libcanberra-gtk-module \
      libexif-dev \
      pulseaudio \
      --no-install-recommends \
    && rm -rf /tmp/* /var/{tmp,cache}/* /var/lib/{apt,dpkg}/ \
    && echo enable-shm=no >> /etc/pulse/client.conf
# Create a group and a user with same id of host user
RUN groupadd -f -g 1000 user \
    && adduser --uid 1000 --gid 1000 --disabled-login --gecos 'User' user \
    && mkdir -p /etc/chromium.d/
ENV HOME /home/user \
# Conf for sound
   PULSE_SERVER /run/pulse/native
# The command that run chromium with the home page
USER user
CMD ["chromium", "--no-first-run","http://ii.nz"]
