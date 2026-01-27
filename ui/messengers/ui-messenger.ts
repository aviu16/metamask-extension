//========
// A file that defines the UI messenger could look something like this. (See
// `ui/index.js` for where `getUIMessenger` is called.) Once constructed, the UI
// messenger would be passed down the React component tree, where it would serve
// as the parent for more specific messengers.
//========

import { ActionConstraint, Messenger } from '@metamask/messenger';
import { AccountTreeControllerSelectedAccountGroupChangeEvent } from '@metamask/account-tree-controller';
import { NotificationServicesController } from '@metamask/notification-services-controller';
import { KeyringControllerUnlockEvent } from '@metamask/keyring-controller';
import { ShieldControllerCheckCoverageAction } from '@metamask/shield-controller';

import {
  WalletServiceGetCodeAction,
  WalletServiceAddNewAccountAction,
  // We are not using any functionality.
  // eslint-disable-next-line import/no-restricted-paths
} from '../../app/scripts/services/wallet-service';
import {
  RewardsControllerGetSeasonMetadataAction,
  RewardsControllerGetSeasonStatusAction,
} from '../../app/scripts/controllers/rewards/rewards-controller.types';
import {
  ROOT_MESSENGER_NAMESPACE,
  // We are not using any functionality.
  // eslint-disable-next-line import/no-restricted-paths
} from '../../app/scripts/lib/messenger';
// We are not using any functionality.
// eslint-disable-next-line import/no-restricted-paths
import { BackgroundRpcClient } from '../store/background-connection';

/**
 * All actions we call through the UI messenger will go through the background
 * connection and will therefore be asynchronous, even if they weren't
 * originally. This type makes a function asynchronous.
 */
type Asynchronize<Fun extends (...args: never[]) => unknown> = Fun extends (
  ...args: infer Args
) => infer Return
  ? (...args: Args) => Promise<Awaited<Return>>
  : never;

/**
 * All actions we call through the UI messenger will go through the background
 * connection and will therefore be asynchronous, even if they weren't
 * originally. This type makes the given actions asynchronous.
 */
type AsynchronizeActions<Action> = Action extends ActionConstraint
  ? {
      type: Action['type'];
      handler: Asynchronize<Action['handler']>;
    }
  : never;

type Actions = AsynchronizeActions<
  | NotificationServicesController.NotificationServicesControllerUpdateMetamaskNotificationsList
  | RewardsControllerGetSeasonMetadataAction
  | RewardsControllerGetSeasonStatusAction
  | ShieldControllerCheckCoverageAction
  | WalletServiceAddNewAccountAction
  | WalletServiceGetCodeAction
>;

type Events =
  | AccountTreeControllerSelectedAccountGroupChangeEvent
  | KeyringControllerUnlockEvent;

export type UIMessenger = Messenger<'UI', Actions, Events>;

const ACTIONS = [
  'NotificationServicesController:updateMetamaskNotificationsList',
  'RewardsController:getSeasonMetadata',
  'RewardsController:getSeasonStatus',
  'ShieldController:checkCoverage',
  'WalletService:addNewAccount',
  'WalletService:getCode',
  // ...
] as const;

const EVENTS = [
  'AccountTreeController:selectedAccountGroupChange',
  'KeyringController:unlock',
  // ...
] as const;

function isKnownEvent(eventName: string): eventName is (typeof EVENTS)[number] {
  const events: readonly string[] = EVENTS;
  return events.includes(eventName);
}

export async function getUIMessenger(
  backgroundConnection: BackgroundRpcClient,
): Promise<UIMessenger> {
  const uiMessenger: UIMessenger = new Messenger({
    namespace: 'UI',
  });

  for (const action of ACTIONS) {
    const handler = async (...args: Parameters<Actions['handler']>) => {
      return await backgroundConnection.call({
        method: action,
        params: args,
      });
    };
    // We intentionally use this method even though it's marked as deprecated,
    // because we are simulating delegation.
    uiMessenger._internalRegisterDelegatedActionHandler(
      action,
      // @ts-expect-error The type of the handler for this method is something
      // that TypeScript wouldn't be able to infer.
      handler,
    );
  }

  backgroundConnection.onNotification(({ method, params }) => {
    if (
      method === 'callEventListener' &&
      params !== undefined &&
      'eventName' in params &&
      typeof params.eventName === 'string' &&
      'eventPayload' in params &&
      Array.isArray(params.eventPayload) &&
      isKnownEvent(params.eventName)
    ) {
      // We intentionally use this method even though it's marked as deprecated,
      // because we are simulating delegation.
      uiMessenger._internalPublishDelegated(
        params.eventName,
        // @ts-expect-error All TypeScript knows is that the payload is some
        // kind of JSON, but we can trust this is the right payload for the
        // event.
        ...params.eventPayload,
      );
    }
  });

  for (const event of EVENTS) {
    await backgroundConnection.call({
      method: `${ROOT_MESSENGER_NAMESPACE}:listen`,
      params: event,
    });
  }

  return uiMessenger;
}
