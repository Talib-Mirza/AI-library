"""merge cover image and subscription renewal

Revision ID: merge_cover_image_and_subscription
Revises: add_cover_image, add_subscription_renewal
Create Date: 2025-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'subscription'
down_revision: Union[str, None] = ('add_cover_image', 'add_subscription_renewal')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op merge migration."""
    pass


def downgrade() -> None:
    """No-op merge migration."""
    pass 