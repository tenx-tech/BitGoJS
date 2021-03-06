import { coroutine as co } from 'bluebird';
import * as nock from 'nock';
import * as should from 'should';

import fixtures from '../../fixtures/trading/tradingPartner';
import { TradingPartnerStatus } from '../../../../src/v2/trading/tradingPartner';

import { Enterprise } from '../../../../src/v2/enterprise';
import { Wallet } from '../../../../src/v2/wallet';
import { TestBitGo } from '../../../lib/test_bitgo';

describe('Trading Partners', function() {
  const microservicesUri = 'https://bitgo-microservices.example';
  let bitgo;
  let basecoin;
  let enterprise;
  let tradingAccount;

  before(co(function *() {
    bitgo = new TestBitGo({ env: 'mock', microservicesUri });
    bitgo.initializeTestVars();
    basecoin = bitgo.coin('ofc');
    basecoin.keychains();

    enterprise = new Enterprise(bitgo, basecoin, { id: '5cf940949449412d00f53b3d92dbcaa3', name: 'Test Enterprise' });

    const walletData = {
      id: '5cf940969449412d00f53b4c55fc2139',
      coin: 'tofc',
      enterprise: enterprise.id,
      keys: [
        'keyid'
      ]
    };

    const wallet = new Wallet(bitgo, basecoin, walletData);
    tradingAccount = wallet.toTradingAccount();
  }));

  it('should list all trading partners', co(function *() {
    const scope = nock(microservicesUri)
      .get(`/api/trade/v1/enterprise/${enterprise.id}/account/${tradingAccount.id}/tradingpartners`)
      .reply(200, fixtures.listTradingPartners);

    const partners = yield tradingAccount.partners().list();

    should.exist(partners);
    partners.should.have.length(2);

    for (const partner of partners) {
      partner.status.should.eql(TradingPartnerStatus.ACCEPTED);
    }

    scope.isDone().should.be.true();
  }));

  it('should balance check trading partners', co(function *() {
    const scope = nock(microservicesUri)
      .get(`/api/trade/v1/enterprise/${enterprise.id}/account/${tradingAccount.id}/tradingpartners`)
      .reply(200, fixtures.listTradingPartners)
      .get(`/api/trade/v1/enterprise/${enterprise.id}/account/${tradingAccount.id}/tradingpartners/${fixtures.listTradingPartners.tradingPartners[0].accountId}/balance`)
      .query(fixtures.balanceCheckTrueRequest)
      .reply(200, { check: true });

    const partners = yield tradingAccount.partners().list();
    should.exist(partners);
    partners.should.have.length(2);

    const balanceCheck = yield partners[0].checkBalance('ofctbtc', '24128');
    balanceCheck.should.be.true();

    scope.isDone().should.be.true();
  }));
});
