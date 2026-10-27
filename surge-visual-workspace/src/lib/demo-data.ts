export const DEMO_SURGE_CONFIG = `[General]
loglevel = notify
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local
bypass-tun = 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
ipv6 = false
show-error-page-for-reject = true
dns-server = 223.5.5.5, 119.29.29.29

[Proxy Group]
💬 AI = select, "♻️ Tier1-Auto", "♻️ Tier2-Auto", "🏗️ Tier1-Select", include-all-proxies=0
🏗️ Tier1-Select = select, "♻️ Tier1-Auto", "♻️ Tier2-Auto", include-all-proxies=0, include-other-group="机场A-Demo, 机场B-Demo"
🚀 Tier2-Select = select, include-all-proxies=0, include-other-group="机场B-Demo, 机场C-Demo"
♻️ Tier1-Auto = url-test, interval=1800, timeout=5, tolerance=88, include-all-proxies=0, include-other-group="机场A-Demo, 机场B-Demo", policy-regex-filter=^(?!.*无脑).*(美国).*$
♻️ Tier2-Auto = url-test, interval=1800, timeout=5, tolerance=60, include-all-proxies=0, include-other-group="机场B-Demo, 机场C-Demo"
🔍 Google = select, "♻️ Tier1-Auto", "🏗️ Tier1-Select", "🚀 Tier2-Select", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 狮城节点", include-all-proxies=0
📹 YouTube&Music = select, "♻️ Tier2-Auto", "🚀 Tier2-Select", "🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", include-all-proxies=0
🎯 全球直连 = select, DIRECT

[Rule]
# 进程级规则
PROCESS-NAME,/Applications/superwhisper.app/,"🏗️ Tier1-Select"
PROCESS-NAME,/Applications/ChatGPT.app/,"💬 AI"
PROCESS-NAME,/Applications/FocusPomo.app/,DIRECT
PROCESS-NAME,/Applications/duet.app/Contents/MacOS/duet,"🚀 Tier2-Select"

# 外部规则集引用
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Google/Gemini%26Antigravity.list,"💬 AI",no-resolve
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Google/Google-General.list,"🔍 Google","update-interval=86400"
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Google/YouTube%26Music.list,"📹 YouTube&Music","update-interval=86400"
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Direct-Peng.list,DIRECT

# 域名规则
DOMAIN-SUFFIX,openai.com,"💬 AI"
DOMAIN-SUFFIX,anthropic.com,"💬 AI"
DOMAIN-SUFFIX,claude.ai,"💬 AI"
DOMAIN-SUFFIX,google.com,"🔍 Google"
DOMAIN-SUFFIX,youtube.com,"📹 YouTube&Music"

# 兜底分流
GEOIP,CN,DIRECT
FINAL,"🚀 Tier2-Select",dns-failed

[Host]
*.local = server:syslib

[MITM]
skip-server-cert-verify = true
`;
