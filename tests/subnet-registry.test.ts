import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/clarity';
import { initSimnet } from '@hirosystems/clarinet-sdk';

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const admin = accounts.get('deployer')!;
const operator = accounts.get('wallet_1')!;
const relayer = accounts.get('wallet_2')!;
const other = accounts.get('wallet_3')!;

describe('subnet-registry', () => {
  describe('register-subnet', () => {
    it('allows admin to register a processing subnet', () => {
      const { result } = simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [
          Cl.uint(1),                              // subnet-type: PROCESSING
          Cl.principal(operator),
          Cl.principal(admin),                     // bridge-contract
          Cl.stringUtf8('Processing Subnet'),
          Cl.stringUtf8('Handles genetic data analysis'),
          Cl.stringUtf8('http://processing.local'),
        ],
        admin,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it('increments subnet IDs for each registration', () => {
      simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [Cl.uint(2), Cl.principal(operator), Cl.principal(admin),
          Cl.stringUtf8('Storage Subnet'), Cl.stringUtf8('IPFS storage'),
          Cl.stringUtf8('http://storage.local')],
        admin,
      );

      const { result } = simnet.callReadOnlyFn(
        'subnet-registry',
        'get-next-subnet-id',
        [],
        admin,
      );
      expect(result).toBeUint(3);
    });

    it('rejects registration from non-admin', () => {
      const { result } = simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [Cl.uint(1), Cl.principal(operator), Cl.principal(other),
          Cl.stringUtf8('Bad Subnet'), Cl.stringUtf8(''),
          Cl.stringUtf8('')],
        other,
      );
      expect(result).toBeErr(Cl.uint(200));
    });

    it('rejects invalid subnet type', () => {
      const { result } = simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [Cl.uint(9), Cl.principal(operator), Cl.principal(admin),
          Cl.stringUtf8('Bad Type'), Cl.stringUtf8(''),
          Cl.stringUtf8('')],
        admin,
      );
      expect(result).toBeErr(Cl.uint(203));
    });
  });

  describe('add-relayer / is-authorized-relayer', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [Cl.uint(1), Cl.principal(operator), Cl.principal(admin),
          Cl.stringUtf8('Test Subnet'), Cl.stringUtf8(''), Cl.stringUtf8('')],
        admin,
      );
    });

    it('adds a relayer and reports it as authorized', () => {
      simnet.callPublicFn('subnet-registry', 'add-relayer',
        [Cl.uint(1), Cl.principal(relayer)], admin);

      const { result } = simnet.callReadOnlyFn(
        'subnet-registry',
        'is-authorized-relayer',
        [Cl.uint(1), Cl.principal(relayer)],
        admin,
      );
      expect(result).toBeBool(true);
    });

    it('reports unknown address as unauthorized', () => {
      const { result } = simnet.callReadOnlyFn(
        'subnet-registry',
        'is-authorized-relayer',
        [Cl.uint(1), Cl.principal(other)],
        admin,
      );
      expect(result).toBeBool(false);
    });
  });

  describe('deactivate-subnet / reactivate-subnet', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [Cl.uint(1), Cl.principal(operator), Cl.principal(admin),
          Cl.stringUtf8('Subnet'), Cl.stringUtf8(''), Cl.stringUtf8('')],
        admin,
      );
    });

    it('deactivates a subnet', () => {
      simnet.callPublicFn('subnet-registry', 'deactivate-subnet', [Cl.uint(1)], admin);
      const { result } = simnet.callReadOnlyFn(
        'subnet-registry', 'is-subnet-active', [Cl.uint(1)], admin,
      );
      expect(result).toBeBool(false);
    });

    it('reactivates a subnet', () => {
      simnet.callPublicFn('subnet-registry', 'deactivate-subnet', [Cl.uint(1)], admin);
      simnet.callPublicFn('subnet-registry', 'reactivate-subnet', [Cl.uint(1)], admin);
      const { result } = simnet.callReadOnlyFn(
        'subnet-registry', 'is-subnet-active', [Cl.uint(1)], admin,
      );
      expect(result).toBeBool(true);
    });
  });

  describe('subnet-heartbeat', () => {
    beforeEach(() => {
      simnet.callPublicFn(
        'subnet-registry',
        'register-subnet',
        [Cl.uint(1), Cl.principal(operator), Cl.principal(admin),
          Cl.stringUtf8('Heartbeat Subnet'), Cl.stringUtf8(''), Cl.stringUtf8('')],
        admin,
      );
    });

    it('operator can record a heartbeat', () => {
      const { result } = simnet.callPublicFn(
        'subnet-registry',
        'subnet-heartbeat',
        [Cl.uint(1), Cl.uint(10)],
        operator,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it('non-operator cannot record heartbeat', () => {
      const { result } = simnet.callPublicFn(
        'subnet-registry',
        'subnet-heartbeat',
        [Cl.uint(1), Cl.uint(5)],
        other,
      );
      expect(result).toBeErr(Cl.uint(200));
    });
  });
});
