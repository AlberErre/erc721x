const { soliditySha3 } = require('web3-utils')
const { assertEventVar,
    expectThrow,
} = require('./helpers')
const { BN } = web3.utils
const bnChai = require('bn-chai')

require('chai')
    .use(require('chai-as-promised'))
    .use(bnChai(BN))
    .should()

const Card = artifacts.require('Card')

contract('Card', accounts => {
    let card
    const  [ alice, bob, carlos ] = accounts;

    beforeEach(async () => {
        card = await Card.new()
    });

    it('Should ZBGCard be deployed', async () => {
        card.address.should.not.be.null

        const name = await card.name.call()
        name.should.be.equal('Card')

        const symbol = await card.symbol.call()
        symbol.should.be.equal('CRD')
    })

    it('Should return correct token uri for FT', async () => {
        const uid = 0
        await card.mint(uid, accounts[0], 2)
        const cardUri = await card.tokenURI.call(uid)
        assert.equal(cardUri, "https://rinkeby.loom.games/erc721/zmb/000000.json")
    })


    it('Should return correct token uri for NFT', async () => {
        const uid = 0
        await card.mint(uid, accounts[0])
        const cardUri = await card.tokenURI.call(uid)
        assert.equal(cardUri, "https://rinkeby.loom.games/erc721/zmb/000000.json")
    })

    it('Should be able to mint a fungible token', async () => {
        const uid = 0
        const amount = 5;
        await card.mint(uid, accounts[0], amount)

        const balanceOf1 = await card.balanceOfCoin.call(accounts[0], uid)
        balanceOf1.should.be.eq.BN(new BN(5))

        const balanceOf2 = await card.balanceOf.call(accounts[0])
        balanceOf2.should.be.eq.BN(new BN(1))
    })

    it('Should be able to mint a non-fungible token', async () => {
        const uid = 0
        await card.mint(uid, accounts[0])

        const balanceOf1 = await card.balanceOfCoin.call(accounts[0], uid)
        balanceOf1.should.be.eq.BN(new BN(1))

        const balanceOf2 = await card.balanceOf.call(accounts[0])
        balanceOf2.should.be.eq.BN(new BN(1))

        const ownerOf = await card.ownerOf.call(uid)
        ownerOf.should.be.eq.BN(accounts[0])
    })

    it('Should be impossible to mint NFT tokens with duplicate tokenId', async () => {
        const uid = 0;
        await card.mint(uid, alice);
        const supplyPostMint = await card.totalSupply()
        await expectThrow(card.mint(uid, alice))
        const supplyPostSecondMint = await card.totalSupply()
        supplyPostMint.should.be.eq.BN(supplyPostSecondMint)
    })

    it('Should be impossible to mint NFT tokens with the same tokenId as an existing FT tokenId', async () => {
        const uid = 0;
        await card.mint(uid, alice, 5);
        const supplyPostMint = await card.totalSupply()
        await expectThrow(card.mint(uid, alice))
        const supplyPostSecondMint = await card.totalSupply()
        supplyPostMint.should.be.eq.BN(supplyPostSecondMint)
    })

    it('Should be impossible to mint FT tokens with the same tokenId as an existing NFT tokenId', async () => {
        const uid = 0;
        await card.mint(uid, alice);
        const supplyPostMint = await card.totalSupply()
        await expectThrow(card.mint(uid, alice, 5))
        const supplyPostSecondMint = await card.totalSupply()
        supplyPostMint.should.be.eq.BN(supplyPostSecondMint)
    })

    it('Should be able to transfer a non fungible token', async () => {
        const uid = 0
        await card.mint(uid, alice)

        const balanceOf1 = await card.balanceOfCoin.call(alice, uid)
        balanceOf1.should.be.eq.BN(new BN(1))

        const balanceOf2 = await card.balanceOf.call(alice)
        balanceOf2.should.be.eq.BN(new BN(1))

        const tx2 = await card.safeTransferFrom(
            alice,
            bob,
            uid,
            { from: alice }
        )

        const ownerOf2 = await card.ownerOf(uid);
        assert.equal(ownerOf2, bob)

        assertEventVar(tx2, 'Transfer', '_from', alice)
        assertEventVar(tx2, 'Transfer', '_to', bob)
        assertEventVar(tx2, 'Transfer', '_tokenId', uid)

        const balanceOf3 = await card.balanceOf.call(bob)
        balanceOf3.should.be.eq.BN(new BN(1))
    })

    it('Should Alice transfer a fungible token', async () => {
        const uid = 0
        const amount = 3
        await card.mint(uid, alice, amount)

        const aliceCardsBefore = await card.balanceOf(alice)
        assert.equal(aliceCardsBefore, 1)

        const bobCardsBefore = await card.balanceOf(bob)
        assert.equal(bobCardsBefore, 0)

        const tx = await card.safeTransferFrom(alice, bob, uid, amount, "0xabcd", {from: alice})

        assertEventVar(tx, 'TransferToken', 'from', alice)
        assertEventVar(tx, 'TransferToken', 'to', bob)
        assertEventVar(tx, 'TransferToken', 'tokenId', uid)
        assertEventVar(tx, 'TransferToken', 'quantity', amount)

        const aliceCardsAfter = await card.balanceOf(alice)
        assert.equal(aliceCardsAfter, 0)
        const bobCardsAfter = await card.balanceOf(bob)
        assert.equal(bobCardsAfter, 1)
    })

    it('Should Alice authorize transfer from Bob', async () => {
        const uid = 0;
        const amount = 5
        await card.mint(uid, alice, amount)
        let tx = await card.setApprovalForAll(bob, true, {from: alice})

        assertEventVar(tx, 'ApprovalForAll', '_owner', alice)
        assertEventVar(tx, 'ApprovalForAll', '_operator', bob)
        assertEventVar(tx, 'ApprovalForAll', '_approved', true)

        tx = await card.safeTransferFrom(alice, bob, uid, amount, "0xabcd", {from: bob})

        assertEventVar(tx, 'TransferToken', 'from', alice)
        assertEventVar(tx, 'TransferToken', 'to', bob)
        assertEventVar(tx, 'TransferToken', 'tokenId', uid)
        assertEventVar(tx, 'TransferToken', 'quantity', amount)
    })

    it('Should Carlos not be authorized to spend', async () => {
        const uid = 0;
        const amount = 5
        let tx = await card.setApprovalForAll(bob, true, {from: alice})

        assertEventVar(tx, 'ApprovalForAll', '_owner', alice)
        assertEventVar(tx, 'ApprovalForAll', '_operator', bob)
        assertEventVar(tx, 'ApprovalForAll', '_approved', true)

        await expectThrow(card.safeTransferFrom(alice, bob, uid, amount, "0xabcd", {from: carlos}))
    })

    it('Should fail to mint quantity of coins larger than packed bin can represent', async () => {
        // each bin can only store numbers < 2^16
        await expectThrow(card.mint(alice, 0, 150000));
    })

    it('Should update balances of sender and receiver', async () => {
        //       bins :   -- 0 --  ---- 1 ----  ---- 2 ----  ---- 3 ----
        let cards  = []; //[0,1,2,3, 16,17,18,19, 32,33,34,35, 48,49,50,51];
        let copies = []; //[0,1,2,3, 12,13,14,15, 11,12,13,14, 11,12,13,14];

        let nCards = 100;
        let nCopiesPerCard = 10;

        //Minting enough copies for transfer for each cards
        for (let i = 300; i < nCards + 300; i++){
            await card.mint(i, alice, nCopiesPerCard);
            cards.push(i);
            copies.push(nCopiesPerCard);
        }

        const tx = await card.batchTransferFrom(alice, bob, cards, copies, {from: alice});

        let balanceFrom;
        let balanceTo;

        for (let i = 0; i < cards.length; i++){
            balanceFrom = await card.balanceOfCoin(alice, cards[i]);
            balanceTo   = await card.balanceOfCoin(bob, cards[i]);

            balanceFrom.should.be.eq.BN(0);
            balanceTo.should.be.eq.BN(copies[i]);
        }

        assertEventVar(tx, 'BatchTransfer', 'from', alice)
        assertEventVar(tx, 'BatchTransfer', 'to', bob)
    })
})
