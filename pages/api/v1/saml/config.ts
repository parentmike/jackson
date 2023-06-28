// Maintain /config path for backward compatibility

import jackson from '@lib/jackson';
import { NextApiRequest, NextApiResponse } from 'next';
import type { DelConnectionsQuery, GetConfigQuery } from '@boxyhq/saml-jackson';
import { sendAudit } from '@ee/audit-log/lib/retraced';
import { extractAuthToken, redactApiKey } from '@lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { connectionAPIController } = await jackson();

    const actor = {
      id: redactApiKey(extractAuthToken(req)),
      name: 'API key',
    };

    if (req.method === 'POST') {
      const connection = await connectionAPIController.config(req.body);

      sendAudit({
        action: 'sso.connection.create',
        crud: 'c',
        actor,
      });

      return res.json(connection);
    } else if (req.method === 'GET') {
      res.json(await connectionAPIController.getConfig(req.query as GetConfigQuery));
    } else if (req.method === 'PATCH') {
      const connection = await connectionAPIController.updateConfig(req.body);

      sendAudit({
        action: 'sso.connection.update',
        crud: 'u',
        actor,
      });

      return res.status(204).end(connection);
    } else if (req.method === 'DELETE') {
      const connection = await connectionAPIController.deleteConfig(req.query as DelConnectionsQuery);

      sendAudit({
        action: 'sso.connection.delete',
        crud: 'd',
        actor,
      });

      return res.status(204).end(connection);
    } else {
      throw { message: 'Method not allowed', statusCode: 405 };
    }
  } catch (err: any) {
    console.error('config api error:', err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
