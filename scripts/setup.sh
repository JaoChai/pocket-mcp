#!/bin/bash
# =====================================================
# PocketBase Brain MCP - Setup Script
# สำหรับติดตั้งบนเครื่องใหม่
# =====================================================

set -e

echo "🧠 PocketBase Brain MCP - Setup"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
CONFIG_DIR="$HOME/.config/pocketbase-brain"
CLAUDE_DIR="$HOME/.claude"
MCP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node -v)${NC}"

# Create config directory
echo ""
echo "📁 Creating config directory..."
mkdir -p "$CONFIG_DIR"

# Build MCP server
echo ""
echo "🔨 Building MCP server..."
cd "$MCP_DIR"
npm install
npm run build
echo -e "${GREEN}✓ Build complete${NC}"

# Create credentials file
echo ""
echo "📝 Setting up credentials..."
if [ ! -f "$CONFIG_DIR/credentials.env" ]; then
    cat > "$CONFIG_DIR/credentials.env" << 'EOF'
# PocketBase Brain Credentials
# แก้ไขค่าด้านล่างให้ตรงกับ credentials ของคุณ

export POCKETBASE_URL="https://pocketbase-claudecode-u33070.vm.elestio.app"
export POCKETBASE_EMAIL="your-email@example.com"
export POCKETBASE_PASSWORD="your-password"
export OPENAI_API_KEY="your-openai-api-key"
export LOG_LEVEL="info"
EOF
    echo -e "${YELLOW}⚠️  Created credentials.env - Please edit with your credentials:${NC}"
    echo "   $CONFIG_DIR/credentials.env"
else
    echo -e "${GREEN}✓ credentials.env already exists${NC}"
fi

# Create wrapper script
echo ""
echo "📜 Creating wrapper script..."
cat > "$CONFIG_DIR/run-mcp.sh" << EOF
#!/bin/bash
# Wrapper script สำหรับรัน PocketBase Brain MCP Server

SCRIPT_DIR="\$(dirname "\$0")"

# Load credentials
if [ -f "\$SCRIPT_DIR/credentials.env" ]; then
    source "\$SCRIPT_DIR/credentials.env"
else
    echo "Error: credentials.env not found" >&2
    exit 1
fi

# Run MCP server
exec node "$MCP_DIR/dist/index.js" "\$@"
EOF
chmod +x "$CONFIG_DIR/run-mcp.sh"
echo -e "${GREEN}✓ Wrapper script created${NC}"

# Setup Claude settings
echo ""
echo "⚙️  Setting up Claude Code..."
mkdir -p "$CLAUDE_DIR"

if [ -f "$CLAUDE_DIR/settings.json" ]; then
    # Check if pocketbase-brain already configured
    if grep -q "pocketbase-brain" "$CLAUDE_DIR/settings.json"; then
        echo -e "${GREEN}✓ Claude settings already configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Please add the following to $CLAUDE_DIR/settings.json:${NC}"
        echo ""
        echo '  "mcpServers": {'
        echo '    "pocketbase-brain": {'
        echo "      \"command\": \"$CONFIG_DIR/run-mcp.sh\""
        echo '    }'
        echo '  }'
    fi
else
    # Create new settings file
    cat > "$CLAUDE_DIR/settings.json" << EOF
{
  "mcpServers": {
    "pocketbase-brain": {
      "command": "$CONFIG_DIR/run-mcp.sh"
    }
  }
}
EOF
    echo -e "${GREEN}✓ Claude settings created${NC}"
fi

# Done
echo ""
echo "================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit credentials: $CONFIG_DIR/credentials.env"
echo "2. Restart Claude Code"
echo ""
