from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_password_reset_tokens'
down_revision = 'df204afbb40b'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(length=128), nullable=False, unique=True, index=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
    )


def downgrade():
    op.drop_table('password_reset_tokens') 