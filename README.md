# Tavus MCP Server

[![smithery badge](https://smithery.ai/badge/@rakeshdavid/tavus-mcp)](https://smithery.ai/server/@rakeshdavid/tavus-mcp)

A comprehensive Model Context Protocol (MCP) server for the Tavus API, enabling AI video generation, replica management, conversational AI, lipsync, and speech synthesis through MCP-compatible applications.

## Features

### 🎭 Phoenix Replicas (5 tools)
- **create_replica** - Create new AI replicas from training videos
- **get_replica** - Get detailed information about a specific replica
- **list_replicas** - List all replicas in your account
- **delete_replica** - Delete a replica permanently
- **rename_replica** - Rename an existing replica

### 🎬 Video Generation (5 tools)
- **generate_video** - Generate videos using replicas with text scripts or audio files
- **get_video** - Get details of a specific video
- **list_videos** - List all videos in your account
- **delete_video** - Delete a video permanently
- **rename_video** - Rename an existing video

### 💬 Conversational AI (5 tools)
- **create_conversation** - Create interactive video conversations
- **get_conversation** - Get details of a specific conversation
- **list_conversations** - List all conversations in your account
- **end_conversation** - End an active conversation
- **delete_conversation** - Delete a conversation permanently

### 👤 Personas (5 tools)
- **create_persona** - Create new personas for conversational AI
- **get_persona** - Get details of a specific persona
- **list_personas** - List all personas in your account
- **patch_persona** - Update a persona using JSON patch format
- **delete_persona** - Delete a persona permanently

### 🎵 Lipsync (4 tools)
- **create_lipsync** - Synchronize audio with existing videos
- **get_lipsync** - Get details of a specific lipsync
- **list_lipsyncs** - List all lipsyncs in your account
- **delete_lipsync** - Delete a lipsync permanently

### 🗣️ Speech Synthesis (5 tools)
- **generate_speech** - Generate speech audio from text using replicas
- **get_speech** - Get details of a specific speech
- **list_speeches** - List all speeches in your account
- **delete_speech** - Delete a speech permanently
- **rename_speech** - Rename an existing speech

## Prerequisites

- Node.js 18+ 
- A Tavus API key (get one at [platform.tavus.io](https://platform.tavus.io))

## Installation

### Installing via Smithery

To install tavus-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@rakeshdavid/tavus-mcp):

```bash
npx -y @smithery/cli install @rakeshdavid/tavus-mcp --client claude
```

### Option 1: NPM Package (Recommended)

```bash
npm install -g tavus-mcp
```

### Option 2: From Source

```bash
git clone https://github.com/rakeshdavid/Tavus-MCP.git
cd Tavus-MCP
npm install
npm run build
```

## Configuration

### Environment Variables

Set your Tavus API key as an environment variable:

```bash
export TAVUS_API_KEY="your_tavus_api_key_here"
```

### MCP Client Configuration

#### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tavus-mcp": {
      "command": "npx",
      "args": ["tavus-mcp"],
      "env": {
        "TAVUS_API_KEY": "your_tavus_api_key_here"
      }
    }
  }
}
```

#### Cline (VS Code Extension)

Add to your Cline MCP settings:

```json
{
  "mcpServers": {
    "tavus-mcp": {
      "command": "npx",
      "args": ["tavus-mcp"],
      "env": {
        "TAVUS_API_KEY": "your_tavus_api_key_here"
      },
      "disabled": false
    }
  }
}
```

#### Other MCP Clients

For other MCP-compatible applications, use:

```bash
npx tavus-mcp
```

With the `TAVUS_API_KEY` environment variable set.

## Usage Examples

Once configured, you can use the Tavus tools through your MCP client:

### List Your Replicas
```
"Can you list my Tavus replicas?"
```

### Generate a Video
```
"Generate a video using replica 'Luna' with the script: 'Hello, welcome to our product demo!'"
```

### Create a Conversational AI
```
"Create a new conversational AI persona using my replica for customer support"
```

### Lipsync Audio to Video
```
"Create a lipsync video using this video URL and this audio URL"
```

## API Coverage

This MCP server provides complete coverage of the Tavus API v2, including:

- **Phoenix Replicas**: Full CRUD operations for AI video replicas
- **Video Generation**: Text-to-video and audio-to-video generation with advanced customization
- **Conversational AI**: Interactive video conversations with persona management
- **Lipsync**: Audio synchronization with existing videos
- **Speech Synthesis**: Text-to-speech generation using replicas

## Development

### Setup

```bash
git clone https://github.com/rakeshdavid/Tavus-MCP.git
cd Tavus-MCP
npm install
```

### Build

```bash
npm run build
```

### Development with Auto-rebuild

```bash
npm run watch
```

### Testing

Set your API key and test the server:

```bash
export TAVUS_API_KEY="your_api_key"
npm run inspector
```

The MCP Inspector will provide a URL to test the server in your browser.

## Error Handling

The server includes comprehensive error handling:

- **Authentication errors**: Invalid API key
- **Rate limiting**: API rate limit exceeded
- **Payment errors**: Insufficient credits (402 status)
- **Validation errors**: Invalid parameters
- **Network errors**: Connection issues

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Tavus API Documentation](https://docs.tavus.io)
- **Issues**: [GitHub Issues](https://github.com/rakeshdavid/Tavus-MCP/issues)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)

## Changelog

### v0.1.0
- Initial release
- Complete Tavus API v2 coverage
- 25 tools across 5 categories
- TypeScript implementation
- Comprehensive error handling
