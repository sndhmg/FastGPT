// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { authUser } from '@/service/utils/auth';
import { connectToDatabase, Chat } from '@/service/mongo';
import { Types } from 'mongoose';
import type { ChatItemType } from '@/types/chat';
import { TaskResponseKeyEnum } from '@/constants/chat';

export type Props = {
  chatId?: string;
  limit?: number;
};
export type Response = { history: ChatItemType[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const { userId } = await authUser({ req });
    const { chatId, limit } = req.body as Props;

    jsonRes<Response>(res, {
      data: await getChatHistory({
        chatId,
        userId,
        limit
      })
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getChatHistory({
  chatId,
  userId,
  limit = 20
}: Props & { userId: string }): Promise<Response> {
  if (!chatId) {
    return { history: [] };
  }

  const history = await Chat.aggregate([
    { $match: { chatId, userId: new Types.ObjectId(userId) } },
    {
      $project: {
        content: {
          $slice: ['$content', -limit] // 返回 content 数组的最后20个元素
        }
      }
    },
    { $unwind: '$content' },
    {
      $project: {
        obj: '$content.obj',
        value: '$content.value',
        [TaskResponseKeyEnum.responseData]: `$content.responseData`
      }
    }
  ]);

  return { history };
}
