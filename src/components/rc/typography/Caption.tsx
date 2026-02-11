import React from 'react';
import { Body, BodyProps } from './Body';

export interface CaptionProps extends Omit<BodyProps, 'size'> {}

export const Caption = React.forwardRef<HTMLElement, CaptionProps>(
  ({ 
    weight = 'regular', 
    colour = 'tertiary', 
    align = 'left', 
    as = 'span', 
    ...props 
  }, ref) => {
    return (
      <Body
        ref={ref}
        size="caption"
        weight={weight}
        colour={colour}
        align={align}
        as={as}
        {...props}
      />
    );
  }
);

Caption.displayName = 'Caption';
