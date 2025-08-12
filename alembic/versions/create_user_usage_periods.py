from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'create_user_usage_periods'
down_revision: Union[str, None] = 'add_ai_query_counter'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'user_usage_periods',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('period_start', sa.Date(), nullable=False, index=True),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('tts_minutes_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ai_queries_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('book_uploads_used', sa.Integer(), nullable=False, server_default='0'),
        sa.UniqueConstraint('user_id', 'period_start', name='uq_user_usage_period'),
    )
    # remove server defaults after initializing
    op.alter_column('user_usage_periods', 'tts_minutes_used', server_default=None)
    op.alter_column('user_usage_periods', 'ai_queries_used', server_default=None)
    op.alter_column('user_usage_periods', 'book_uploads_used', server_default=None)

def downgrade() -> None:
    op.drop_table('user_usage_periods') 