"""
AIニュースダイジェスト 実行エントリーポイント
"""
import sys
import os

# digestパッケージをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from digest.main import run

if __name__ == "__main__":
    run()
