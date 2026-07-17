export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

// message is a translation key (see i18n/locales/*.ts, "newVisit.*") — the
// caller translates it, since this module has no access to i18next context.
export function getCurrentPosition(): Promise<GpsPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("newVisit.gpsNotSupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(
          new Error(err.code === err.PERMISSION_DENIED ? "newVisit.gpsPermissionDenied" : "newVisit.gpsUnavailable"),
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
