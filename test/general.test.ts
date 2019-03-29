import { publicKey, verifySignature } from '@waves/waves-crypto'
import { reissue, signTx, data, burn } from '../src'
import { broadcast, serialize, verify, addressBalance, addressDataByKey } from '../src/general'
import { reissueMinimalParams, burnMinimalParams, orderMinimalParams } from './minimalParams'
import { TTx } from '../src'
import { exampleTxs } from './exampleTxs'
import { order } from '../src/requests/order'

const stringSeed = 'df3dd6d884714288a39af0bd973a1771c9f00f168cf040d6abb6a50dd5e055d8'

describe('signTx', () => {

  const txs = Object.keys(exampleTxs).map(x => (<any>exampleTxs)[x] as TTx)
  txs.forEach(tx => {
    it('type: ' + tx.type, () => {
      const signed = signTx(tx, stringSeed)
      const bytes = serialize(signed)
      expect(verifySignature(publicKey(stringSeed), bytes, signed.proofs[1]!)).toBeTruthy()
    })
  })

  it('should throw on no public key or seed', () => {
    const tx = () => reissue({ ...reissueMinimalParams } as any)
    expect(tx).toThrow('Please provide either seed or senderPublicKey')
  })

  it('should add additional fee to auto calculated one', () => {
    const tx = burn({ ...burnMinimalParams, additionalFee: 100000 }, stringSeed)
    expect(tx.fee).toEqual(200000)
  })

  it('should throw when index already exists', () => {
    const tx = reissue({ ...reissueMinimalParams }, stringSeed)
    const signedTwoTimes = () => signTx(tx, [stringSeed])
    expect(signedTwoTimes).toThrow('Proof at index 0 already exists')
  })

  it('should throw when type is unknown', () => {
    const tx = reissue({ ...reissueMinimalParams }, stringSeed)
    const signedTwoTimes = () => signTx({ ...tx, type: 99 }, [stringSeed])
    expect(signedTwoTimes).toThrow('Unknown tx type: 99')
  })
})

describe('Node interaction', () => {
  const nodeUrl = 'https://nodes.0bsnetwork.com/'

  it('should send tx to node', async () => {
    const dataParams = {
      data: [
        {
          key: 'oneTwo',
          value: false,
        },
        {
          key: 'twoThree',
          value: 2,
        },
        {
          key: 'three',
          value: Uint8Array.from([1, 2, 3, 4, 5, 6]),
        },
      ],
      timestamp: 100000,
    }
    const result = data(dataParams, 'seed')

    await expect(broadcast(result, nodeUrl)).rejects
      .toEqual(new Error('Transaction is not allowed by account-script'))
  })

  it('should retrieve address balance', async () => {
    const balance = await addressBalance('3PGMh3vQekpTbvUAiKwdzhWsLaxoSBEcsFJ', nodeUrl);
    expect(typeof balance).toBe('number')
  })

  it('should retrieve address data by key', async () => {
    const data1 = await addressDataByKey('3PGMh3vQekpTbvUAiKwdzhWsLaxoSBEcsFJ', 'example', nodeUrl);
    const data2 = await addressDataByKey('3P5Y26hscWLGxtq2MSMbVsJUx9ZrQHoJLP7', '3PQgaVmE7Zurn3xFMYtckah82PrWuaEcdhR', nodeUrl)
    expect(data1).toBe(null)
    expect(typeof data2).toBe('string')
  })

})

it('verify signatures of txs and orders', async () => {
  const ord = order(orderMinimalParams, stringSeed)
  const tx = burn(burnMinimalParams, [null, stringSeed])
  expect(verify(ord)).toEqual(true)
  expect(verify(tx, 1)).toEqual(true)
})