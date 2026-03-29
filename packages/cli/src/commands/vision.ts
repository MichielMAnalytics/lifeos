import { Command } from 'commander';
import type { ApiListResponse, ApiResponse } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
} from '../output.js';

interface VisionBoardItem {
  _id?: string;
  id?: string;
  imageUrl?: string;
  image_url?: string;
  caption?: string | null;
  position?: number;
}

export const visionCommand = new Command('vision')
  .description('Manage your vision board');

visionCommand
  .command('list')
  .description('List vision board items')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<VisionBoardItem>>('/api/v1/vision-board');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No vision board items found.');
        return;
      }

      const rows = res.data.map((item) => [
        shortId(item),
        (item.imageUrl ?? item.image_url ?? '-').length > 50
          ? (item.imageUrl ?? item.image_url ?? '-').slice(0, 47) + '...'
          : (item.imageUrl ?? item.image_url ?? '-'),
        item.caption ?? '-',
        String(item.position ?? 0),
      ]);
      printTable(['ID', 'Image URL', 'Caption', 'Position'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

visionCommand
  .command('add <imageUrl>')
  .description('Add a vision board item')
  .option('-c, --caption <text>', 'Caption for the image')
  .option('-p, --position <num>', 'Position (ordering)')
  .action(async (imageUrl: string, opts: { caption?: string; position?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { imageUrl };
      if (opts.caption) body.caption = opts.caption;
      if (opts.position) body.position = parseFloat(opts.position);

      const res = await client.post<ApiResponse<VisionBoardItem>>('/api/v1/vision-board', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Vision board item added (${shortId(res.data)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

visionCommand
  .command('update <id>')
  .description('Update a vision board item')
  .option('-u, --image-url <url>', 'New image URL')
  .option('-c, --caption <text>', 'New caption')
  .option('-p, --position <num>', 'New position')
  .action(async (id: string, opts: { imageUrl?: string; caption?: string; position?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.imageUrl) body.imageUrl = opts.imageUrl;
      if (opts.caption) body.caption = opts.caption;
      if (opts.position) body.position = parseFloat(opts.position);

      const res = await client.patch<ApiResponse<VisionBoardItem>>(`/api/v1/vision-board/${id}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Vision board item updated (${shortId(res.data)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

visionCommand
  .command('remove <id>')
  .description('Remove a vision board item')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/vision-board/${id}`);
      printSuccess(`Vision board item ${id.slice(0, 8)} removed.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
