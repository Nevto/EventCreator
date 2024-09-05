import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { EventCreator } from "../typechain-types";
import { deployEventCreatorFixture } from "./fixtures/deployFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EventCreator", function () {
    let eventCreator: EventCreator;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;

    beforeEach(async function () {
        const { eventCreator: deployedEventCreator, deployer } = await loadFixture(deployEventCreatorFixture);
        eventCreator = deployedEventCreator as any;
        owner = deployer;
        [addr1, addr2, addr3] = await hre.ethers.getSigners();
    });

    describe("Deployment", function () {
        it("Should set the correct default values", async function () {
            expect(await eventCreator.defaultMaxParticipants()).to.equal(10);
            expect(await eventCreator.defaultRegistrationFee()).to.equal(ethers.parseEther("0.05"));
        });
    });

    describe("Should create events correctly", () => {
        it("should create an event", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            const event = await eventCreator.events(0);
            expect(event.name).to.equal("Test Event").to.emit(eventCreator, "eventCreated").withArgs(0, await owner.getAddress());


            const theEvent = await eventCreator.events(0);
            expect(theEvent.organizer).to.equal(await owner.getAddress());
            expect(theEvent.isOpen).to.be.true;
        });

        it("should revert when trying to create an event with a past deadline", async function () {
            const pastDeadline = Math.floor(Date.now() / 1000) - 3600;
            await expect(eventCreator.createEvent("Past Event", pastDeadline)).to.be.revertedWith("Deadline must be in the future.");
        });

    })

    describe("Participant registration, registration opening and closing should all be handled correctly", () => {


        it("should not reopen registration if max participants have been reached", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);

            for (let i = 0; i < 10; i++) {
                const participant = (await ethers.getSigners())[i + 1];
                await eventCreator.connect(participant).register(0, { value: ethers.parseEther("0.05") });
            }

            await expect(eventCreator.openRegistration(0)).to.be.revertedWith("Cannot reopen: Max participants reached.");
        });

        it("should close the event when maxParticipants is reached", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);

            for (let i = 0; i < 10; i++) {
                const participant = (await ethers.getSigners())[i + 1];
                await eventCreator.connect(participant).register(0, { value: ethers.parseEther("0.05") });
            }
            await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") }))
                .to.be.revertedWith("Registration is closed.");

            const event = await eventCreator.events(0);
            expect(event.isOpen).to.be.false;
        });


        describe("Testing the openRegistration and closeRegistration functions", async () => {

            it("should open and close registration", async function () {
                await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
                await eventCreator.closeRegistration(0);
                let event = await eventCreator.events(0);
                expect(event.isOpen).to.equal(false);

                await eventCreator.openRegistration(0);
                event = await eventCreator.events(0);
                expect(event.isOpen).to.equal(true);
            });

            it("should not open registration if already open", async function () {
                await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
                await expect(eventCreator.openRegistration(0)).to.be.revertedWith("Registration is already open.");
            });
            it("Should revert if trying to close registration when it is already closed", async function () {
                await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);

                await eventCreator.closeRegistration(0);
                await expect(eventCreator.closeRegistration(0)).to.be.revertedWith("Registration is already closed.");
            });

        });

        it("Should revert if trying to open registration after the deadline", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);

            await eventCreator.closeRegistration(0);
            await time.increase(7200);
            await expect(eventCreator.openRegistration(0)).to.be.revertedWith("Cannot reopen: Deadline has passed.");
        });
        it("should register a participant", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
            const participants = await eventCreator.getParticipants(0);
            expect(participants[0]).to.equal(addr2.address).to.emit(eventCreator, "participantRegistered").withArgs(0, addr2.address);
        });

        it("should register a participant exactly at the deadline", async function () {
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            await eventCreator.createEvent("Test Event", deadline);
            await time.increaseTo(deadline);
            await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") }))
                .to.be.revertedWith("Registration deadline has passed.");
        });
        it("Should return an empty list if no participants have registered", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            const participants = await eventCreator.getParticipants(0);
            expect(participants).to.be.an('array').that.is.empty;
            it("Should return the list of participants correctly after registration", async function () {
                await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
                await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
                await eventCreator.connect(addr3).register(0, { value: ethers.parseEther("0.05") });

                const participants = await eventCreator.getParticipants(0);

                const participantAddresses = [await addr2.getAddress(), await addr3.getAddress()];

                expect(participants).to.be.an('array').that.includes.members(participantAddresses);
            });
        });
        it("Should reflect changes in participants list when new participants register", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });

            let participants = await eventCreator.getParticipants(0);
            expect(participants).to.include(await addr2.getAddress());
            expect(participants).to.have.lengthOf(1);
            await eventCreator.connect(addr3).register(0, { value: ethers.parseEther("0.05") });

            participants = await eventCreator.getParticipants(0);
            expect(participants).to.include(await addr3.getAddress());
            expect(participants).to.have.lengthOf(2);
        });
        it("should not allow organizer to register", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await expect(eventCreator.register(0, { value: ethers.parseEther("0.05") })).to.be.revertedWith("Organizer cannot register for their own event.");
        });
        it("should not allow double registration", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
            await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") })).to.be.revertedWith("Address has already registered for this event.");
        });

        it("should handle too low registration fee", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.01") })).to.be.revertedWithCustomError(eventCreator, "TooLow");
        });

        it("should handle too high registration fee", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.1") })).to.be.revertedWithCustomError(eventCreator, "TooMuch");
        });
    });


    describe("Withdrawal of funds", () => {

        it("should withdraw funds", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
            await eventCreator.closeRegistration(0);
            const initialBalance = await ethers.provider.getBalance(owner.address);
            await eventCreator.withdraw(0);
            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.be.gt(initialBalance);

        });

        it("should revert withdrawal if there are no funds in the contract", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.closeRegistration(0);

            await expect(eventCreator.withdraw(0)).to.be.revertedWith("No funds available to withdraw.");
        });

        it("Should revert if trying to withdraw funds while the event is still open", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });

            await expect(eventCreator.withdraw(0)).to.be.revertedWith("Event is still open.");
        });

        it("should revert if a non-organizer tries to withdraw funds", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
            await eventCreator.closeRegistration(0);
            await expect(eventCreator.connect(addr2).withdraw(0)).to.be.revertedWith("Only the organizer can perform this action");
        });
        it("should revert if trying to withdraw funds multiple times", async function () {
            await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
            await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
            await eventCreator.closeRegistration(0);
            await eventCreator.withdraw(0);
            await expect(eventCreator.withdraw(0)).to.be.revertedWith("No funds available to withdraw.");
        });
    });

    describe("Testing edge cases, for example, the maximum name length", () => {
        it("should create an event with the maximum name length", async function () {
            const maxLengthName = 'A'.repeat(256);
            await eventCreator.createEvent(maxLengthName, Math.floor(Date.now() / 1000) + 3600);
            const event = await eventCreator.events(0);
            console.log("Contract Address:", owner.address);
            expect(event.name).to.equal(maxLengthName);
        });

    });


    describe("Fallback and receive functions", () => {
        it("should trigger fallback function and revert with 'Fallback Function'", async function () {
            const { eventCreator, deployer } = await loadFixture(deployEventCreatorFixture);

            await expect(deployer.sendTransaction({ to: eventCreator.getAddress(), data: "0x1234" }))
                .to.be.revertedWith("Fallback Function")
        });



        it("should trigger receive function and revert with 'Fallback Function'", async function () {
            const { eventCreator, deployer } = await loadFixture(deployEventCreatorFixture);

            await expect(deployer.sendTransaction({ to: eventCreator.getAddress(), value: ethers.parseEther("1.0") })).to.be.revertedWith("This contract does not accept Ether");
        });
    });
});





