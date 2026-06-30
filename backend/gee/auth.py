"""
Google Earth Engine — Authentication
Supports both service account (production) and OAuth (local dev).
"""

import os
from pathlib import Path
from loguru import logger

import ee
from backend.config import settings


def initialize_gee() -> bool:
    """
    Initialise the GEE Python API.

    Priority:
      1. Service account (if GEE_SERVICE_ACCOUNT_EMAIL is set in env)
      2. Interactive OAuth credentials cache (~/.config/earthengine/)

    Returns True on success, False on failure.
    """
    project = settings.gee_project_id
    try:
        sa_email = settings.gee_service_account_email
        sa_key_path = Path(settings.gee_service_account_key_path)

        if sa_email and sa_key_path.exists():
            logger.info(f"Authenticating GEE via service account: {sa_email}")
            credentials = ee.ServiceAccountCredentials(
                email=sa_email,
                key_file=str(sa_key_path),
            )
            ee.Initialize(credentials, project=project)
        else:
            logger.info(
                "No service account configured — falling back to OAuth. "
                "Run `earthengine authenticate` if this fails."
            )
            ee.Initialize(project=project)

        # Quick sanity check
        info = ee.Number(1).add(1).getInfo()
        assert info == 2, "GEE computation sanity check failed"
        logger.success("Google Earth Engine authenticated successfully ✓")
        return True

    except ee.EEException as exc:
        err_msg = str(exc)
        logger.error(f"GEE authentication failed: {exc}")

        if "serviceusage.services.use" in err_msg or "does not have permission" in err_msg:
            logger.warning(
                "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "  GEE PROJECT PERMISSION ERROR\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"  Project used: {project}\n\n"
                "  FIX OPTIONS:\n"
                "  1) Grant yourself the 'Service Usage Consumer' role:\n"
                f"     https://console.cloud.google.com/iam-admin/iam?project={project}\n"
                "     → Add role: roles/serviceusage.serviceUsageConsumer\n\n"
                "  2) OR set a different project in .env:\n"
                "     GEE_PROJECT_ID=your-ee-enabled-project-id\n\n"
                "  3) OR re-authenticate:\n"
                "     earthengine authenticate --auth_mode=gcloud\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )
        else:
            logger.warning(
                "To authenticate locally: run `earthengine authenticate` in your terminal.\n"
                "For server deploy: set GEE_SERVICE_ACCOUNT_EMAIL and GEE_SERVICE_ACCOUNT_KEY_PATH."
            )
        return False
    except Exception as exc:
        logger.error(f"Unexpected error during GEE init: {exc}")
        return False


if __name__ == "__main__":
    # Quick CLI test:  python -m backend.gee.auth
    success = initialize_gee()
    if success:
        print("\n✅ GEE is ready. You can now fetch Coimbatore satellite imagery.")
    else:
        print("\n❌ GEE initialisation failed. See logs above.")
