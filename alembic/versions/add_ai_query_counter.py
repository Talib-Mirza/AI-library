from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_ai_query_counter'
down_revision: Union[str, None] = 'df204afbb40b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('total_ai_queries', sa.Integer(), nullable=False, server_default='0'))
    op.execute("UPDATE users SET total_ai_queries = 0 WHERE total_ai_queries IS NULL")
    op.alter_column('users', 'total_ai_queries', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'total_ai_queries') 