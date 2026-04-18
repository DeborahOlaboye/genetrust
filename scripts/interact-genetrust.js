// GeneTrust Multi-User Activity Script
// Interacts with all 4 deployed GeneTrust contracts across multiple users
// Usage: node interact-genetrust.js

const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  stringUtf8CV,
  principalCV,
  trueCV,
  falseCV,
  bufferCV,
} = require('@stacks/transactions');

// ─── CLI Args ─────────────────────────────────────────────────────────────────
// Usage: node interact-genetrust.js [--dry-run] [--users N] [--rounds N]
const args        = process.argv.slice(2);
const DRY_RUN     = args.includes('--dry-run');
const argUsers    = args.indexOf('--users');
const argRounds   = args.indexOf('--rounds');

// ─── Scale Config ─────────────────────────────────────────────────────────────
const NUM_USERS_LIMIT = argUsers !== -1 ? parseInt(args[argUsers + 1], 10) : 20;
const NUM_ROUNDS      = argRounds !== -1 ? parseInt(args[argRounds + 1], 10) : 5;

// ─── Fee / Timing Config ──────────────────────────────────────────────────────
const TX_FEE          = BigInt(400);   // fee per transaction in microSTX
const SLEEP_BETWEEN   = 2000;          // ms between calls within a user round
const RATE_LIMIT_WAIT = 10000;         // ms to wait on 429 rate-limit response
const CHAIN_WAIT      = 120000;        // ms to wait on TooMuchChaining error

// ─── Contract Config ──────────────────────────────────────────────────────────
const CONTRACT_OWNER = 'SP3KKFRRWQVJXEJCGM6ZB359EF01VRY86HW6CCD45';
const NODE_URL       = 'https://api.hiro.so';

// Owner key for admin-only calls (register-verifier)
const OWNER_KEY = 'YOUR_OWNER_PRIVATE_KEY_HERE_01';

const PRIVATE_KEYS = [
  "e20370d965db414087a7a8b56339e18df314eae1b1136ecbf3f8febc3dbd6cc301",
  "b804a4bcbe16945cec47456d7b9be29f5c5845ad0d2663ab6d31a31e85aa217a01",
  "03241eb9f2773de979800e2e5919fb6b4d3b14cb77bd590b64b65f3e5fd937f201",
  "cb381a911eef61167369799d95e36b2b36fa15d24bce36932821a55a07d0809201",
  "5b223a0e02f9d65746fe78c9a2801c4d59a607855f767087b3d46da60c6ce3de01",
  "98a1e313e9cf14cde5f6f7dc54a2a2eb65c33334d34ced4b3e6178bbbfaab34701",
  "43c106744417037176b70b36574c007cc9a81bad101d6888f04f0c27a4773d1001",
  "04031af40d89eaf6b34fee0b245b4d8fcacc3f2d74734925ecf2cfb0cdd4e1e101",
  "cd79a55ff4e0f71f5b0ec8f193c26c2dd85115bccda0b2c92f092ecac65bf18301",
  "6fb0409f6e1653189c18b0e7a45edec4136149b16140c579518c837ed04d717b01",
  "24a2a13835c60f93139288e22cc7363fff3de8abf9a27a691099df46f8bcebda01",
  "a1def4468fa862d9d038f60a06849abf710ef26fa344e6941e74a16d073e54e701",
  "ca4bb5565c8de6b042a1602eb8708057bbee52b3ddd005a835b85039bd6ea18a01",
  "f55ed71a06052251982228b95a40e57392f32a51029ec09279e9ed83a36a1a1601",
  "e96addfe37aac3557697e31bf5a89ac9bedbed1d0bc42464468b6fcd3480467901",
  "c7da82b550477d83ee18bbd1cd74813963e0e6699736c61339bcbcc56309ef8d01",
  "8989c8afabc38b38dcd27084e787c6870ce4b814731da7c5ccbfd08ace43d13b01",
  "c08a55ddc4af08a261616c5898b1876c2c5d991b970ef19de414efdf761e4c6201",
  "a33c71b93d41039e9ea9ce77a6ef92c79d68d25785f72f806224ba95b834b35a01",
  "565c8363ac1536c4ebb6af5c5eae805513c8e968bb250f1680ae232bae1eff3b01"
];

const ADDRESSES = [
  "SP2ZX61HWHEH7VJGWART16EWPNEKTCZ3D9BDTS69T",
  "SP37T4DT944JDF0QR0DSGEDS15QRJ4EWVXFBD671J",
  "SP1JBGQXSK7YQJYNHJ6VAN92M8RWEHKAKG80G2417",
  "SPQY7QP7PNQCB6D98BYJ3W1BD9B6715R68ZBEGWR",
  "SP3D58P4FGJ4KA1THKGZANR7HSCV3QCBNMTP8HPRK",
  "SPPAZZVY4ZN5QKRBZB8JGG047CGCT9EBTXK9ZBNV",
  "SP1EVA2XC56C7Z5AKAZ5SNGBYZW5Y8R4KCKJZP2DN",
  "SP1S9ZCEZWWDXTED1C5EMQMA6B0XJXQ0J6Q4BTE5V",
  "SP358MCZ7VYRDFV5HCCH534SM9BHDV2D6TJ407P1K",
  "SP1W0YPFEE09JEBDXHM1B65Q9QQPCRNSF0YMJD711",
  "SP1YEVQNK56B5RPVEYA6DGB99JJAHYM2VF37SVP79",
  "SP3Y03AH4A30SWHP39FHHZ2JS2AYNSMCQRM47489V",
  "SP2WTF17W1282T5JT64SS2H0M4Q00TK3X545BKEP2",
  "SP3YZDAFHAEMJ2QMXM2F72VWJZ2R8AJW621Q6B98D",
  "SP3E2A764PB3B0A7XQ664YSEV6MECA9G1X4TJ30SR",
  "SP27NDVQ6HKA98FW51E90N2MGZ60SBT606TE4FX14",
  "SP2J08TH3ZE5VBYD0N7NN57NDB7C17PXZ3EXR5E5T",
  "SP25X1NV0MQ10V5KX38KDKHRQV03PB15HX8DTN4XC",
  "SPRRDFMHQTEYYM12534M1Z9BCX4S8EQ0VAGZJ3VA",
  "SP7CMRBSGJ0ZD17TMC7R3VBYBMY1Z4MDSDE40QDN"
];

const NUM_USERS = Math.min(ADDRESSES.length, NUM_USERS_LIMIT);

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  ownerNonce: BigInt(0),
  userNonces: new Array(NUM_USERS).fill(BigInt(0)),
  successCount: 0,
  failCount: 0,
  roundSuccess: [],
  roundFail: [],
  startTime: Date.now(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Pad a string to a fixed-length buffer (zero-padded on the right)
function makeBuffer(seed, length) {
  const src = Buffer.from(seed);
  const buf = Buffer.alloc(length, 0);
  src.copy(buf, 0, 0, Math.min(src.length, length));
  return bufferCV(buf);
}

function makeHash(seed)   { return makeBuffer(seed, 32); }
function makeParams(seed) { return makeBuffer(seed, 64); }

async function getNonce(address) {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${NODE_URL}/extended/v1/address/${address}/nonces`);
      if (res.status === 429) { await sleep(RATE_LIMIT_WAIT * (i + 1)); continue; }
      if (!res.ok) { await sleep(SLEEP_BETWEEN * (i + 1)); continue; }
      const data = await res.json();
      return BigInt(data.possible_next_nonce);
    } catch {
      await sleep(SLEEP_BETWEEN * (i + 1));
    }
  }
  throw new Error(`Failed to get nonce for ${address}`);
}

// userIdx = -1 for owner, >= 0 for users
async function callContract(userIdx, contractName, functionName, functionArgs) {
  const isOwner  = userIdx === -1;
  const senderKey = isOwner ? OWNER_KEY : PRIVATE_KEYS[userIdx];
  let nonce = isOwner ? state.ownerNonce : state.userNonces[userIdx];

  if (DRY_RUN) {
    process.stdout.write('(dry)');
    state.successCount++;
    if (isOwner) state.ownerNonce++;
    else state.userNonces[userIdx]++;
    return 0;
  }

  let attempts = 0;
  while (true) {
    let result;
    try {
      const transaction = await makeContractCall({
        contractAddress: CONTRACT_OWNER,
        contractName,
        functionName,
        functionArgs,
        senderKey,
        network: 'mainnet',
        nonce,
        fee: TX_FEE,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
      });
      result = await broadcastTransaction({ transaction, network: 'mainnet' });
    } catch (err) {
      process.stdout.write('✗');
      state.failCount++;
      return 1;
    }

    attempts++;
    const errMsg = result.error ? (result.reason || result.error) : '';

    if (errMsg.includes('429') || errMsg.includes('Too Many Requests')) {
      process.stdout.write('(wait)');
      await sleep(RATE_LIMIT_WAIT);
      if (attempts >= 5) { process.stdout.write('✗'); state.failCount++; return 1; }
      continue;
    }

    if (errMsg.includes('TooMuchChaining')) {
      process.stdout.write('(chain-wait)');
      await sleep(CHAIN_WAIT);
      nonce = await getNonce(isOwner ? CONTRACT_OWNER : ADDRESSES[userIdx]);
      if (isOwner) state.ownerNonce = nonce;
      else state.userNonces[userIdx] = nonce;
      if (attempts >= 20) { process.stdout.write('✗'); state.failCount++; return 1; }
      continue;
    }

    if (errMsg.includes('NotEnoughFunds')) {
      process.stdout.write('✗(funds)');
      state.failCount++;
      return 2;
    }

    if (errMsg) {
      nonce = await getNonce(isOwner ? CONTRACT_OWNER : ADDRESSES[userIdx]);
      if (isOwner) state.ownerNonce = nonce;
      else state.userNonces[userIdx] = nonce;
      process.stdout.write('✗');
      state.failCount++;
      return 1;
    }

    process.stdout.write('✓');
    state.successCount++;
    if (isOwner) state.ownerNonce++;
    else state.userNonces[userIdx]++;
    return 0;
  }
}

// ─── Per-User Interactions ────────────────────────────────────────────────────
async function processUser(userIdx, round) {
  const dataId    = userIdx + 1 + (round * NUM_USERS); // unique data-id per round
  const listingId = dataId;
  const grantee   = ADDRESSES[(userIdx + 1) % NUM_USERS];

  // 1. dataset-registry: register a genetic dataset
  process.stdout.write('  [dataset-registry::register-dataset]  ');
  let rc = await callContract(userIdx, 'dataset-registry', 'register-dataset', [
    makeHash(`hash-user${userIdx}-round${round}`),
    stringUtf8CV(`https://storage.genetrust.io/data/${dataId}`),
    stringUtf8CV(`Genetic dataset ${dataId} uploaded by user ${userIdx + 1}`),
    uintCV(1),       // access level: basic
    uintCV(100000),  // price: 0.1 STX
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  // 2. data-governance: set consent for the dataset
  process.stdout.write('\n  [data-governance::set-consent]        ');
  rc = await callContract(userIdx, 'data-governance', 'set-consent', [
    uintCV(dataId),
    trueCV(),   // research consent
    falseCV(),  // commercial consent
    trueCV(),   // clinical consent
    uintCV(2),  // jurisdiction: EU (GDPR)
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  // 3. dataset-registry: grant access to next user
  process.stdout.write('\n  [dataset-registry::grant-access]      ');
  rc = await callContract(userIdx, 'dataset-registry', 'grant-access', [
    uintCV(dataId),
    principalCV(grantee),
    uintCV(1), // basic access
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  // 4. exchange: list the dataset on the marketplace
  process.stdout.write('\n  [exchange::create-listing]            ');
  rc = await callContract(userIdx, 'exchange', 'create-listing', [
    uintCV(dataId),
    uintCV(100000), // 0.1 STX
    uintCV(1),      // access level: basic
    stringUtf8CV(`Genomic dataset ${dataId} - research use`),
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  // 5. attestations: register a proof for the dataset
  process.stdout.write('\n  [attestations::register-proof]        ');
  rc = await callContract(userIdx, 'attestations', 'register-proof', [
    uintCV(dataId),
    uintCV(1), // proof type: gene presence
    makeHash(`proof-hash-user${userIdx}-round${round}`),
    makeParams(`params-user${userIdx}-round${round}`),
    stringUtf8CV(`Gene presence attestation for dataset ${dataId}`),
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  // 6. data-governance: request GDPR data portability
  process.stdout.write('\n  [data-governance::request-portability]');
  rc = await callContract(userIdx, 'data-governance', 'request-portability', [
    uintCV(dataId),
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  // 7. exchange: cancel the listing created in step 4
  // listing-id is auto-incremented per create-listing call; we track via dataId
  process.stdout.write('\n  [exchange::cancel-listing]             ');
  rc = await callContract(userIdx, 'exchange', 'cancel-listing', [
    uintCV(listingId),
  ]);
  if (rc === 2) return;
  await sleep(SLEEP_BETWEEN);

  console.log('');
}

// ─── Owner-Only Interactions ──────────────────────────────────────────────────
async function runOwnerCalls() {
  if (!OWNER_KEY || OWNER_KEY.includes('YOUR_OWNER')) {
    console.log('  Skipping owner calls (OWNER_KEY not set)');
    return;
  }

  console.log('Running owner-only contract calls...\n');

  // Register a trusted verifier (medical lab)
  process.stdout.write('  [attestations::register-verifier]     ');
  await callContract(-1, 'attestations', 'register-verifier', [
    stringUtf8CV('GeneTrust Lab Partner'),
    principalCV(ADDRESSES[0]),
  ]);
  await sleep(SLEEP_BETWEEN);

  console.log('\n');
  console.log('Owner calls complete.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('  GeneTrust Multi-Contract Interaction Script');
  console.log(`  Contract Owner: ${CONTRACT_OWNER}`);
  console.log('════════════════════════════════════════════════════\n');

  if (NUM_USERS === 0) {
    console.error('No user wallets configured. Add private keys and addresses to the arrays.');
    process.exit(1);
  }

  const callsPerUser  = 6;
  const totalExpected = NUM_USERS * callsPerUser * NUM_ROUNDS + 1;
  console.log(`Number of users: ${NUM_USERS}  |  Rounds: ${NUM_ROUNDS}`);
  console.log(`Calls per user:  ${callsPerUser} (register-dataset, set-consent, grant-access, create-listing, register-proof, request-portability)`);
  console.log(`Target:          ${totalExpected} transactions\n`);

  if (OWNER_KEY && !OWNER_KEY.includes('YOUR_OWNER')) {
    console.log('Fetching owner nonce...');
    state.ownerNonce = await getNonce(CONTRACT_OWNER);
    console.log(`  Owner nonce: ${state.ownerNonce}`);
  }

  console.log('\nInitializing user nonces...');
  for (let userIdx = 0; userIdx < NUM_USERS; userIdx++) {
    state.userNonces[userIdx] = await getNonce(ADDRESSES[userIdx]);
  }
  console.log('  Done.\n');

  for (let round = 0; round < NUM_ROUNDS; round++) {
    const pct = Math.round(((round) / NUM_ROUNDS) * 100);
    console.log(`━━━ Round ${round + 1}/${NUM_ROUNDS} (${pct}% complete) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    const roundStartSuccess = state.successCount;
    const roundStartFail    = state.failCount;
    for (let userIdx = 0; userIdx < NUM_USERS; userIdx++) {
      console.log(`User ${userIdx + 1}/${NUM_USERS}: ${ADDRESSES[userIdx].slice(0, 12)}... (nonce: ${state.userNonces[userIdx]})`);
      await processUser(userIdx, round);
      console.log('');
    }
    const roundOk   = state.successCount - roundStartSuccess;
    const roundFail = state.failCount - roundStartFail;
    state.roundSuccess.push(roundOk);
    state.roundFail.push(roundFail);
    console.log(`  Round ${round + 1} summary: ${roundOk} ok, ${roundFail} failed\n`);
  }

  console.log('');
  await runOwnerCalls();

  const rate = totalExpected > 0 ? ((state.successCount / totalExpected) * 100).toFixed(1) : 'N/A';
  console.log('════════════════════════════════════════════════════');
  console.log('  GeneTrust Activity Complete!');
  console.log('════════════════════════════════════════════════════');
  console.log(`  Successful transactions: ${state.successCount}`);
  console.log(`  Failed transactions:     ${state.failCount}`);
  console.log(`\n  Target: ${totalExpected} transactions (${NUM_USERS} users × ${callsPerUser} calls × ${NUM_ROUNDS} rounds + 1 owner call)`);
  console.log(`  Success rate: ${rate}%\n`);
  console.log(`  View contract activity:`);
  console.log(`  https://explorer.hiro.so/address/${CONTRACT_OWNER}?chain=mainnet\n`);
  console.log('  Individual contracts:');
  console.log(`  https://explorer.hiro.so/address/${CONTRACT_OWNER}.dataset-registry?chain=mainnet`);
  console.log(`  https://explorer.hiro.so/address/${CONTRACT_OWNER}.exchange?chain=mainnet`);
  console.log(`  https://explorer.hiro.so/address/${CONTRACT_OWNER}.data-governance?chain=mainnet`);
  console.log(`  https://explorer.hiro.so/address/${CONTRACT_OWNER}.attestations?chain=mainnet\n`);
}

main().catch(console.error);
