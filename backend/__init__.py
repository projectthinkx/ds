"""
Backend Module Structure
========================

This module provides a modular structure for the DentalSuthra backend.
The main server.py file contains all the working code - this structure 
is designed for gradual migration.

Directory Structure:
- /models/     - Pydantic models (data schemas)
- /routes/     - API route handlers
- /utils/      - Utility functions (auth, database, helpers)

Usage:
------
Models and utilities can be imported from here for new features.
Existing features remain in server.py for stability.

Example:
    from utils.auth import get_current_user, get_password_hash
    from utils.database import db
"""

from utils.database import db, client
from utils.auth import (
    get_current_user, 
    verify_password, 
    get_password_hash, 
    create_access_token,
    security
)

__all__ = [
    'db',
    'client', 
    'get_current_user',
    'verify_password',
    'get_password_hash',
    'create_access_token',
    'security'
]
