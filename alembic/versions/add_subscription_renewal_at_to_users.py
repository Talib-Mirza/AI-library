from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_subscription_renewal'
down_revision = '368e2d63924f'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('subscription_renewal_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'subscription_renewal_at') 