"""
Vercel Serverless Function entry point for Ulaa360 API.
Handles all /api/* routes through Vercel's Python runtime.
"""
import os
import sys

# Ensure root directory and scripts directory are in Python path
API_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(API_DIR)
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")

for p in [ROOT_DIR, SCRIPTS_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from server import Ulaa360Handler

class handler(Ulaa360Handler):
    """Vercel Python serverless function handler"""
    pass
