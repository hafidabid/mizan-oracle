import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import { readBoardMemberInfo } from './chain';

export interface BoardMembership {
  loading: boolean;
  isActive: boolean;
  name: string | null;
}

export const useBoardMembership = (address: Address | null): BoardMembership => {
  const [state, setState] = useState<BoardMembership>({ loading: false, isActive: false, name: null });

  useEffect(() => {
    if (!address) {
      setState({ loading: false, isActive: false, name: null });
      return;
    }
    let cancelled = false;
    setState({ loading: true, isActive: false, name: null });
    readBoardMemberInfo(address)
      .then(([name, , active]) => {
        if (!cancelled) setState({ loading: false, isActive: active, name: active ? name : null });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, isActive: false, name: null });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
};
