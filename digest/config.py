"""
情報源の設定
"""

# --- RSS フィード ---
RSS_FEEDS = [
    ("https://openai.com/news/rss.xml", "OpenAI"),
    (
        "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic.xml",
        "Anthropic",
    ),
    ("https://zenn.dev/topics/ai/feed", "Zenn AI"),
]

# RSSHubの代替インスタンスリスト（順番に試す）
RSSHUB_INSTANCES = [
    "https://rsshub.app",
]

# --- X アカウント (RSSHub経由) ---
RSSHUB_BASE = "https://rsshub.app/twitter/user/"

X_ACCOUNTS = [
    # Claude Code / Cursor 関連
    "DeNAxAI_NEWS",
    "akihiro_genai",
    "gota_bara",
    "oikon48",
    "plant_ja",
    "seratch_ja",
    "tegnike",
    "gosrum",
    "kazuph",
    "commte",
    "yoshiko_pg",
    "kim_career_0621",
    "sakito",
    "yoppy0123",
    "tomohisa",
    "kinopee_ai",
    "ryu_f_web",
    "CaddiTech",
    "minorun365",
    "RiKobuki",
    "SS_chneider",
    # Codex / OpenAI 関連
    "talk_like_staw",
    "suna_gaku",
    "murasametech",
    # 生成AI・AIエージェント全般
    "akino_1027",
    "nuits_jp",
    "Mates_ENGINEER",
    "shoota",
    "kaz3284",
    "digi_kuma_",
    "suh_sunaneko",
    "MLBear2",
    "laiso",
    "HayattiQ",
    "ML_deep",
    "Emukei_",
    "mugu_KagawaAI",
    "kajikent",
    "robinebers",
    "cursorvers",
    "hiroki_daichi",
    "taziku_co",
    "Shimayus",
    "ai_database",
    "chankostin",
    "tkosht",
    "AravSrinivas",
    "mt_musyu",
    "yktyshr",
    "eiraces",
    # Dify / ノーコードAI関連
    "DifyJapan",
    "miyatti",
    "rik423__ai",
    # MCP・AI開発ツール関連
    "yoshimi0227_",
    "Keisuke69",
    "ryoppippi",
    # AI・個人開発
    "omotidaisukijp",
    "medmuspg",
    "natsumican63",
    "nukonuko",
    # 企業・組織アカウント（AI発信）
    "TimeeDev",
    "cloudpack_jp",
    "googlecloud_jp",
    "googlejapan",
    "gihyo_hansoku",
    "ADWAYS_ENGINEER",
    "DeNAPR",
    "findy_tools",
    # 海外AI情報
    "IndianTechGuide",
    "haydenbleasel",
    "mattshumer_",
    # AI/ML研究・学習・情報発信
    "NGO275",
    "Nozium1",
    "dai___you",
    "go__tanaka",
    "r_kawamata",
    "codenote_net",
    "kaonash_",
    "yuyhiraka",
    "u1",
    "iwamot",
    "yugen_matuni",
    "integrated1453",
    "flatt_security",
    "lmt_swallow",
    "dify_base",
    "isaoshimizu",
    "ayami_marketing",
    "gyakuse",
    "NotionHQ",
    "suthio_",
    "Sudachikawaii",
    "pkm_tk111",
    "snow_new_jp",
    "itchie_tatsumi",
    "OpenAIDevs",
    "Cursor",
    "arrakis_ai",
]

def get_x_feed_configs() -> list[tuple[str, str]]:
    """Xアカウントのフィード設定リストを返す"""
    return [(f"{RSSHUB_BASE}{account}", account) for account in X_ACCOUNTS]
