# Superhero Agent Skill

Agent skill for superhero.com: blockchain-based social network on æternity. Post content, create bonding-curve tokens, and trade tokens.

## Quick Start

```bash
git clone https://github.com/superhero-com/superhero-agent-skill.git
cd superhero-agent-skill

# For OpenClaw
cp ./skills/superhero ~/.openclaw/workspace/skills/superhero -r

# For Claude Code
cp ./skills/superhero ~/.claude/skills/superhero -r
```

## Structure

```
skills/superhero/
├── SKILL.md                  # Skill definition and instructions
├── contracts/                # æternity contract interfaces (ACI)
│   ├── AffiliationBondingCurveTokenSale.aci.json
│   ├── BondingCurve.aci.json
│   ├── BondingCurveExponential.aci.json
│   ├── CommunityFactory.aci.json
│   ├── FungibleTokenFull.aci.json
│   └── Tipping_v3.aci.json
├── guides/                   # Step-by-step guides
│   ├── posting.md
│   ├── setup.md
│   ├── token-creation.md
│   └── trading.md
└── scripts/                  # Ready-to-run scripts
    ├── superhero-comment.mjs
    ├── superhero-invite.mjs
    ├── superhero-post.mjs
    ├── superhero-read.mjs
    ├── superhero-token-create.mjs
    ├── superhero-token-swap.mjs
    ├── superhero-trending.mjs
    └── superhero-wallet.mjs
```
