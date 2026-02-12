import React from 'react';
import { Body } from '@/components/rc';
import type { Message } from '@/types';

interface UserMessageProps {
  message: Message;
}

const UserMessage: React.FC<UserMessageProps> = ({ message }) => (
  <div className="flex justify-end">
    <div className="max-w-[560px] rounded-[18px] px-[18px] py-4 bg-[#2d2d2d]">
      <Body size="body" colour="on-accent" as="p" className="whitespace-pre-wrap w-auto">
        {message.content}
      </Body>
    </div>
  </div>
);

export default UserMessage;
