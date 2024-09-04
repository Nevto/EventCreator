import { ethers } from "hardhat";
import { expect } from "chai";
import { EventCreator } from "../typechain-types";

describe("EventCreator", function () {
    let EventCreator: any;
    let eventCreator: any;
    let owner: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        EventCreator = await ethers.getContractFactory("EventCreator");
        eventCreator = (await EventCreator.deploy()) as EventCreator;
    });

    it("should create an event", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        const event = await eventCreator.events(0);
        expect(event.name).to.equal("Test Event");
    });

    it("should open and close registration", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.closeRegistration(0);
        let event = await eventCreator.events(0);
        expect(event.isOpen).to.equal(false);

        await eventCreator.openRegistration(0);
        event = await eventCreator.events(0);
        expect(event.isOpen).to.equal(true);
    });

    it("should register a participant", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.connect(addr1).register(0, { value: ethers.parseEther("0.05") });
        const participants = await eventCreator.getParticipants(0);
        expect(participants[0]).to.equal(addr1.address);
    });

    it("should not allow organizer to register", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.register(0, { value: ethers.parseEther("0.05") })).to.be.revertedWith("Organizer cannot register for their own event.");
    });

    it("should not allow double registration", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.connect(addr1).register(0, { value: ethers.parseEther("0.05") });
        await expect(eventCreator.connect(addr1).register(0, { value: ethers.parseEther("0.05") })).to.be.revertedWith("Address has already registered for this event.");
    });

    it("should handle too low registration fee", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.connect(addr1).register(0, { value: ethers.parseEther("0.01") })).to.be.revertedWithCustomError(eventCreator, "TooLow");
    });

    it("should handle too high registration fee", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.connect(addr1).register(0, { value: ethers.parseEther("0.1") })).to.be.revertedWithCustomError(eventCreator, "TooMuch");
    });

    it("should withdraw funds", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.connect(addr1).register(0, { value: ethers.parseEther("0.05") });
        await eventCreator.closeRegistration(0);
        const initialBalance = await ethers.provider.getBalance(owner.address);
        await eventCreator.withdraw(0);
        const finalBalance = await ethers.provider.getBalance(owner.address);
        expect(finalBalance).to.be.gt(initialBalance);
    });

});



