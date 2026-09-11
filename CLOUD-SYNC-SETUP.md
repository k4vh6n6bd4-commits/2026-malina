# Cloud Sync setup

## Important
This app must run on **Netlify** for Cloud Sync to work because `/api/planner-sync` is a Netlify Function. GitHub Pages is only suitable for a static preview and will not provide the planner sync API.

## First migration
1. Open the planner on the device that has the correct data (for example, laptop).
2. Settings → Cloud Sync → log in to the same Netlify Identity account.
3. Tap **↑ Энэ төхөөрөмж → Cloud**.
4. On the second device, log in to the same account.
5. If the local device is empty, the app downloads the Cloud data automatically. You can also tap **↓ Cloud → энэ төхөөрөмж**.

## Conflict safety
If both devices already contain meaningful data, the app does not silently overwrite either copy. It shows two choices so you can explicitly select the source.

## GitHub Actions
The included GitHub workflow is only a build check. Do not use GitHub Pages as the production deployment for this app.
