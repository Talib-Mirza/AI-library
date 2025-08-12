"""add profile fields to users

Revision ID: add_profile_fields_to_users
Revises: df204afbb40b
Create Date: 2024-01-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_profile_fields_to_users'
down_revision = 'df204afbb40b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profile fields to users table
    op.add_column('users', sa.Column('profile_picture_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('website', sa.String(255), nullable=True))
    
    # Add usage statistics fields
    op.add_column('users', sa.Column('total_files_uploaded', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('total_tts_minutes', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove profile fields from users table
    op.drop_column('users', 'profile_picture_url')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'location')
    op.drop_column('users', 'website')
    
    # Remove usage statistics fields
    op.drop_column('users', 'total_files_uploaded')
    op.drop_column('users', 'total_tts_minutes')
    op.drop_column('users', 'last_login_at') 