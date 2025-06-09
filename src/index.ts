#!/usr/bin/env node

/**
 * Tavus MCP Server
 * 
 * A comprehensive Model Context Protocol server for the Tavus API.
 * Provides tools for AI video generation, replica management, conversational AI,
 * lipsync, and speech synthesis.
 * 
 * Features:
 * - Phoenix Replicas: Create, manage, and train AI video replicas
 * - Video Generation: Generate videos from text scripts or audio files
 * - Conversational AI: Create interactive video conversations with personas
 * - Lipsync: Synchronize audio with existing videos
 * - Speech Synthesis: Generate speech audio from text
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, AxiosError } from 'axios';

// Environment variables
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
if (!TAVUS_API_KEY) {
  throw new Error('TAVUS_API_KEY environment variable is required');
}

// Tavus API base URL
const TAVUS_API_BASE = 'https://tavusapi.com/v2';

// Type definitions for Tavus API responses
interface TavusReplica {
  replica_id: string;
  replica_name: string;
  thumbnail_video_url?: string;
  training_progress: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  replica_type?: string;
}

interface TavusVideo {
  video_id: string;
  video_name: string;
  status: string;
  hosted_url?: string;
  download_url?: string;
  stream_url?: string;
  created_at: string;
}

interface TavusConversation {
  conversation_id: string;
  conversation_name?: string;
  conversation_url: string;
  status: string;
  created_at: string;
}

interface TavusPersona {
  persona_id: string;
  persona_name?: string;
  replica_id?: string;
  context?: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

interface TavusLipsync {
  lipsync_id: string;
  status: string;
  video_url?: string;
  created_at: string;
}

interface TavusSpeech {
  speech_id: string;
  speech_name?: string;
  status: string;
  audio_url?: string;
  created_at: string;
}

class TavusServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "tavus-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Configure axios instance with Tavus API settings
    this.axiosInstance = axios.create({
      baseURL: TAVUS_API_BASE,
      headers: {
        'x-api-key': TAVUS_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Phoenix Replicas
        {
          name: 'create_replica',
          description: 'Create a new AI replica from a training video',
          inputSchema: {
            type: 'object',
            properties: {
              train_video_url: {
                type: 'string',
                description: 'Direct link to training video (S3, etc.)',
              },
              replica_name: {
                type: 'string',
                description: 'Name for the replica',
              },
              consent_video_url: {
                type: 'string',
                description: 'Optional separate consent video URL',
              },
              callback_url: {
                type: 'string',
                description: 'URL to receive training completion callback',
              },
              model_name: {
                type: 'string',
                description: 'Phoenix model version (phoenix-3 default)',
                enum: ['phoenix-2', 'phoenix-3'],
              },
              properties: {
                type: 'object',
                description: 'Additional replica properties',
                properties: {
                  gaze_correction: { type: 'boolean' },
                  background_green_screen: { type: 'boolean' },
                },
              },
            },
            required: ['train_video_url'],
          },
        },
        {
          name: 'get_replica',
          description: 'Get details of a specific replica',
          inputSchema: {
            type: 'object',
            properties: {
              replica_id: {
                type: 'string',
                description: 'Unique identifier for the replica',
              },
              verbose: {
                type: 'boolean',
                description: 'Include additional replica data',
              },
            },
            required: ['replica_id'],
          },
        },
        {
          name: 'list_replicas',
          description: 'List all replicas in your account',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'delete_replica',
          description: 'Delete a replica permanently',
          inputSchema: {
            type: 'object',
            properties: {
              replica_id: {
                type: 'string',
                description: 'Unique identifier for the replica',
              },
            },
            required: ['replica_id'],
          },
        },
        {
          name: 'rename_replica',
          description: 'Rename an existing replica',
          inputSchema: {
            type: 'object',
            properties: {
              replica_id: {
                type: 'string',
                description: 'Unique identifier for the replica',
              },
              replica_name: {
                type: 'string',
                description: 'New name for the replica',
              },
            },
            required: ['replica_id', 'replica_name'],
          },
        },

        // Video Generation
        {
          name: 'generate_video',
          description: 'Generate a video using a replica and script or audio',
          inputSchema: {
            type: 'object',
            properties: {
              replica_id: {
                type: 'string',
                description: 'Unique identifier for the replica',
              },
              script: {
                type: 'string',
                description: 'Text script for the video (alternative to audio_url)',
              },
              audio_url: {
                type: 'string',
                description: 'URL to audio file (.wav/.mp3) (alternative to script)',
              },
              video_name: {
                type: 'string',
                description: 'Name for the generated video',
              },
              background_url: {
                type: 'string',
                description: 'Website URL to use as background',
              },
              background_source_url: {
                type: 'string',
                description: 'Direct video URL to use as background',
              },
              callback_url: {
                type: 'string',
                description: 'URL to receive completion callback',
              },
              fast: {
                type: 'boolean',
                description: 'Use fast rendering (limited features)',
              },
              transparent_background: {
                type: 'boolean',
                description: 'Generate with transparent background (.webm)',
              },
              watermark_image_url: {
                type: 'string',
                description: 'URL to watermark image (png/jpeg)',
              },
              properties: {
                type: 'object',
                description: 'Additional video properties',
                properties: {
                  background_scroll: { type: 'boolean' },
                  background_scroll_type: { type: 'string', enum: ['human', 'smooth'] },
                  background_scroll_depth: { type: 'string', enum: ['middle', 'bottom'] },
                  background_scroll_return: { type: 'string', enum: ['return', 'halt'] },
                  start_with_wave: { type: 'boolean' },
                },
              },
            },
            required: ['replica_id'],
            anyOf: [
              { required: ['script'] },
              { required: ['audio_url'] },
            ],
          },
        },
        {
          name: 'get_video',
          description: 'Get details of a specific video',
          inputSchema: {
            type: 'object',
            properties: {
              video_id: {
                type: 'string',
                description: 'Unique identifier for the video',
              },
            },
            required: ['video_id'],
          },
        },
        {
          name: 'list_videos',
          description: 'List all videos in your account',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'delete_video',
          description: 'Delete a video permanently',
          inputSchema: {
            type: 'object',
            properties: {
              video_id: {
                type: 'string',
                description: 'Unique identifier for the video',
              },
            },
            required: ['video_id'],
          },
        },
        {
          name: 'rename_video',
          description: 'Rename an existing video',
          inputSchema: {
            type: 'object',
            properties: {
              video_id: {
                type: 'string',
                description: 'Unique identifier for the video',
              },
              video_name: {
                type: 'string',
                description: 'New name for the video',
              },
            },
            required: ['video_id', 'video_name'],
          },
        },

        // Conversational Video Interface
        {
          name: 'create_conversation',
          description: 'Create a new conversational video interface',
          inputSchema: {
            type: 'object',
            properties: {
              replica_id: {
                type: 'string',
                description: 'Replica to use for the conversation',
              },
              persona_id: {
                type: 'string',
                description: 'Persona to use for the conversation',
              },
              conversation_name: {
                type: 'string',
                description: 'Name for the conversation',
              },
              callback_url: {
                type: 'string',
                description: 'URL to receive conversation events',
              },
              conversational_context: {
                type: 'string',
                description: 'Context for the conversation',
              },
              custom_greeting: {
                type: 'string',
                description: 'Custom greeting message',
              },
              enable_recording: {
                type: 'boolean',
                description: 'Enable conversation recording',
              },
            },
          },
        },
        {
          name: 'get_conversation',
          description: 'Get details of a specific conversation',
          inputSchema: {
            type: 'object',
            properties: {
              conversation_id: {
                type: 'string',
                description: 'Unique identifier for the conversation',
              },
            },
            required: ['conversation_id'],
          },
        },
        {
          name: 'list_conversations',
          description: 'List all conversations in your account',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'end_conversation',
          description: 'End an active conversation',
          inputSchema: {
            type: 'object',
            properties: {
              conversation_id: {
                type: 'string',
                description: 'Unique identifier for the conversation',
              },
            },
            required: ['conversation_id'],
          },
        },
        {
          name: 'delete_conversation',
          description: 'Delete a conversation permanently',
          inputSchema: {
            type: 'object',
            properties: {
              conversation_id: {
                type: 'string',
                description: 'Unique identifier for the conversation',
              },
            },
            required: ['conversation_id'],
          },
        },

        // Replica Personas
        {
          name: 'create_persona',
          description: 'Create a new persona for conversational AI',
          inputSchema: {
            type: 'object',
            properties: {
              persona_name: {
                type: 'string',
                description: 'Name for the persona',
              },
              replica_id: {
                type: 'string',
                description: 'Replica to use for this persona',
              },
              context: {
                type: 'string',
                description: 'Contextual information for the LLM',
              },
              system_prompt: {
                type: 'string',
                description: 'System prompt for the LLM',
              },
              layers: {
                type: 'object',
                description: 'Configuration layers for the persona',
                properties: {
                  stt: { type: 'object', description: 'Speech-to-text settings' },
                  llm: { type: 'object', description: 'Language model settings' },
                  tts: { type: 'object', description: 'Text-to-speech settings' },
                  perception: { type: 'object', description: 'Perception settings (Raven-0)' },
                },
              },
            },
          },
        },
        {
          name: 'get_persona',
          description: 'Get details of a specific persona',
          inputSchema: {
            type: 'object',
            properties: {
              persona_id: {
                type: 'string',
                description: 'Unique identifier for the persona',
              },
            },
            required: ['persona_id'],
          },
        },
        {
          name: 'list_personas',
          description: 'List all personas in your account',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'patch_persona',
          description: 'Update a persona using JSON patch format',
          inputSchema: {
            type: 'object',
            properties: {
              persona_id: {
                type: 'string',
                description: 'Unique identifier for the persona',
              },
              patch: {
                type: 'array',
                description: 'JSON patch operations (RFC 6902)',
                items: {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['add', 'remove', 'replace', 'copy', 'move', 'test'] },
                    path: { type: 'string' },
                    value: {},
                  },
                  required: ['op', 'path'],
                },
              },
            },
            required: ['persona_id', 'patch'],
          },
        },
        {
          name: 'delete_persona',
          description: 'Delete a persona permanently',
          inputSchema: {
            type: 'object',
            properties: {
              persona_id: {
                type: 'string',
                description: 'Unique identifier for the persona',
              },
            },
            required: ['persona_id'],
          },
        },

        // Lipsync
        {
          name: 'create_lipsync',
          description: 'Create a lipsync video by synchronizing audio with video',
          inputSchema: {
            type: 'object',
            properties: {
              video_url: {
                type: 'string',
                description: 'URL to the source video',
              },
              audio_url: {
                type: 'string',
                description: 'URL to the audio file to sync',
              },
              callback_url: {
                type: 'string',
                description: 'URL to receive completion callback',
              },
            },
            required: ['video_url', 'audio_url'],
          },
        },
        {
          name: 'get_lipsync',
          description: 'Get details of a specific lipsync',
          inputSchema: {
            type: 'object',
            properties: {
              lipsync_id: {
                type: 'string',
                description: 'Unique identifier for the lipsync',
              },
            },
            required: ['lipsync_id'],
          },
        },
        {
          name: 'list_lipsyncs',
          description: 'List all lipsyncs in your account',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'delete_lipsync',
          description: 'Delete a lipsync permanently',
          inputSchema: {
            type: 'object',
            properties: {
              lipsync_id: {
                type: 'string',
                description: 'Unique identifier for the lipsync',
              },
            },
            required: ['lipsync_id'],
          },
        },

        // Speech
        {
          name: 'generate_speech',
          description: 'Generate speech audio from text using a replica',
          inputSchema: {
            type: 'object',
            properties: {
              replica_id: {
                type: 'string',
                description: 'Replica to use for speech generation',
              },
              script: {
                type: 'string',
                description: 'Text script to convert to speech',
              },
              speech_name: {
                type: 'string',
                description: 'Name for the generated speech',
              },
              callback_url: {
                type: 'string',
                description: 'URL to receive completion callback',
              },
            },
            required: ['replica_id', 'script'],
          },
        },
        {
          name: 'get_speech',
          description: 'Get details of a specific speech',
          inputSchema: {
            type: 'object',
            properties: {
              speech_id: {
                type: 'string',
                description: 'Unique identifier for the speech',
              },
            },
            required: ['speech_id'],
          },
        },
        {
          name: 'list_speeches',
          description: 'List all speeches in your account',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'delete_speech',
          description: 'Delete a speech permanently',
          inputSchema: {
            type: 'object',
            properties: {
              speech_id: {
                type: 'string',
                description: 'Unique identifier for the speech',
              },
            },
            required: ['speech_id'],
          },
        },
        {
          name: 'rename_speech',
          description: 'Rename an existing speech',
          inputSchema: {
            type: 'object',
            properties: {
              speech_id: {
                type: 'string',
                description: 'Unique identifier for the speech',
              },
              speech_name: {
                type: 'string',
                description: 'New name for the speech',
              },
            },
            required: ['speech_id', 'speech_name'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          // Phoenix Replicas
          case 'create_replica':
            return await this.createReplica(request.params.arguments);
          case 'get_replica':
            return await this.getReplica(request.params.arguments);
          case 'list_replicas':
            return await this.listReplicas();
          case 'delete_replica':
            return await this.deleteReplica(request.params.arguments);
          case 'rename_replica':
            return await this.renameReplica(request.params.arguments);

          // Videos
          case 'generate_video':
            return await this.generateVideo(request.params.arguments);
          case 'get_video':
            return await this.getVideo(request.params.arguments);
          case 'list_videos':
            return await this.listVideos();
          case 'delete_video':
            return await this.deleteVideo(request.params.arguments);
          case 'rename_video':
            return await this.renameVideo(request.params.arguments);

          // Conversations
          case 'create_conversation':
            return await this.createConversation(request.params.arguments);
          case 'get_conversation':
            return await this.getConversation(request.params.arguments);
          case 'list_conversations':
            return await this.listConversations();
          case 'end_conversation':
            return await this.endConversation(request.params.arguments);
          case 'delete_conversation':
            return await this.deleteConversation(request.params.arguments);

          // Personas
          case 'create_persona':
            return await this.createPersona(request.params.arguments);
          case 'get_persona':
            return await this.getPersona(request.params.arguments);
          case 'list_personas':
            return await this.listPersonas();
          case 'patch_persona':
            return await this.patchPersona(request.params.arguments);
          case 'delete_persona':
            return await this.deletePersona(request.params.arguments);

          // Lipsync
          case 'create_lipsync':
            return await this.createLipsync(request.params.arguments);
          case 'get_lipsync':
            return await this.getLipsync(request.params.arguments);
          case 'list_lipsyncs':
            return await this.listLipsyncs();
          case 'delete_lipsync':
            return await this.deleteLipsync(request.params.arguments);

          // Speech
          case 'generate_speech':
            return await this.generateSpeech(request.params.arguments);
          case 'get_speech':
            return await this.getSpeech(request.params.arguments);
          case 'list_speeches':
            return await this.listSpeeches();
          case 'delete_speech':
            return await this.deleteSpeech(request.params.arguments);
          case 'rename_speech':
            return await this.renameSpeech(request.params.arguments);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.error || error.message;
          throw new McpError(ErrorCode.InternalError, `Tavus API error: ${message}`);
        }
        throw new McpError(ErrorCode.InternalError, `Unexpected error: ${error}`);
      }
    });
  }

  // Phoenix Replicas Methods
  private async createReplica(args: any) {
    const response = await this.axiosInstance.post('/replicas', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async getReplica(args: any) {
    const { replica_id, verbose } = args;
    const params = verbose ? { verbose } : {};
    const response = await this.axiosInstance.get(`/replicas/${replica_id}`, { params });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async listReplicas() {
    const response = await this.axiosInstance.get('/replicas');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async deleteReplica(args: any) {
    const { replica_id } = args;
    await this.axiosInstance.delete(`/replicas/${replica_id}`);
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted replica ${replica_id}`,
      }],
    };
  }

  private async renameReplica(args: any) {
    const { replica_id, replica_name } = args;
    const response = await this.axiosInstance.patch(`/replicas/${replica_id}/name`, {
      replica_name,
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  // Video Methods
  private async generateVideo(args: any) {
    const response = await this.axiosInstance.post('/videos', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async getVideo(args: any) {
    const { video_id } = args;
    const response = await this.axiosInstance.get(`/videos/${video_id}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async listVideos() {
    const response = await this.axiosInstance.get('/videos');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async deleteVideo(args: any) {
    const { video_id } = args;
    await this.axiosInstance.delete(`/videos/${video_id}`);
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted video ${video_id}`,
      }],
    };
  }

  private async renameVideo(args: any) {
    const { video_id, video_name } = args;
    const response = await this.axiosInstance.patch(`/videos/${video_id}/name`, {
      video_name,
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  // Conversation Methods
  private async createConversation(args: any) {
    const response = await this.axiosInstance.post('/conversations', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async getConversation(args: any) {
    const { conversation_id } = args;
    const response = await this.axiosInstance.get(`/conversations/${conversation_id}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async listConversations() {
    const response = await this.axiosInstance.get('/conversations');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async endConversation(args: any) {
    const { conversation_id } = args;
    const response = await this.axiosInstance.post(`/conversations/${conversation_id}/end`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async deleteConversation(args: any) {
    const { conversation_id } = args;
    await this.axiosInstance.delete(`/conversations/${conversation_id}`);
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted conversation ${conversation_id}`,
      }],
    };
  }

  // Persona Methods
  private async createPersona(args: any) {
    const response = await this.axiosInstance.post('/personas', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async getPersona(args: any) {
    const { persona_id } = args;
    const response = await this.axiosInstance.get(`/personas/${persona_id}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async listPersonas() {
    const response = await this.axiosInstance.get('/personas');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async patchPersona(args: any) {
    const { persona_id, patch } = args;
    const response = await this.axiosInstance.patch(`/personas/${persona_id}`, patch);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async deletePersona(args: any) {
    const { persona_id } = args;
    await this.axiosInstance.delete(`/personas/${persona_id}`);
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted persona ${persona_id}`,
      }],
    };
  }

  // Lipsync Methods
  private async createLipsync(args: any) {
    const response = await this.axiosInstance.post('/lipsync', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async getLipsync(args: any) {
    const { lipsync_id } = args;
    const response = await this.axiosInstance.get(`/lipsync/${lipsync_id}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async listLipsyncs() {
    const response = await this.axiosInstance.get('/lipsync');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async deleteLipsync(args: any) {
    const { lipsync_id } = args;
    await this.axiosInstance.delete(`/lipsync/${lipsync_id}`);
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted lipsync ${lipsync_id}`,
      }],
    };
  }

  // Speech Methods
  private async generateSpeech(args: any) {
    const response = await this.axiosInstance.post('/speech', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async getSpeech(args: any) {
    const { speech_id } = args;
    const response = await this.axiosInstance.get(`/speech/${speech_id}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async listSpeeches() {
    const response = await this.axiosInstance.get('/speech');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  private async deleteSpeech(args: any) {
    const { speech_id } = args;
    await this.axiosInstance.delete(`/speech/${speech_id}`);
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted speech ${speech_id}`,
      }],
    };
  }

  private async renameSpeech(args: any) {
    const { speech_id, speech_name } = args;
    const response = await this.axiosInstance.patch(`/speech/${speech_id}/name`, {
      speech_name,
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      }],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tavus MCP server running on stdio');
  }
}

const server = new TavusServer();
server.run().catch(console.error);
