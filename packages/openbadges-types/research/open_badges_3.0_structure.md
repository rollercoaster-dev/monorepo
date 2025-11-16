# Open Badges 3.0 Structure

Open Badges 3.0 represents a significant change from version 2.0, adopting the Verifiable Credentials Data Model v2.0. This changes the structure of Open Badges to align with verifiable credentials standards.

## Key Differences from Open Badges 2.0

1. **Verifiable Credentials Structure**: Open Badges 3.0 uses the Verifiable Credentials Data Model, which provides enhanced security and privacy through cryptographic proofs.

2. **Relationship Structure Changes**:
   - In Open Badges 2.0: An Assertion identifies a recipient with a "recipient" relationship to an IdentityObject, identifies which badge it represents with a "badge" relationship to a BadgeClass, and identifies its verification information with a "verification" relationship to a VerificationObject.
   - In Open Badges 3.0: A Verifiable Credential identifies its recipient with a "credentialSubject" relationship to a subject class identified by an identifier. It identifies its issuer with an "issuer" relationship directly to an Issuer. The Credential claims the subject has met the criteria of a specific Achievement with an "achievement" relationship, and it identifies its verification information with a proof.

## Major Components of Open Badges 3.0

1. **Digital Credential Assertion (VC)**
   - Connected to an Issuer
   - Contains a proof
   - Has credentialSubject relationships to:
     - DC Achievement
     - Results
     - Recipient
     - Evidence

2. **DC Achievement**
   - Can have Alignments
   - Can have Result Descriptions

3. **Issuer**: Entity that issues the credential

4. **Proof**: Cryptographic verification information

5. **Recipient**: The entity receiving the credential

6. **Evidence**: Documentation of the work that earned the credential

## Benefits of Open Badges 3.0

1. Interoperability with Digital Wallets and Verifiable Presentations
2. Increased data privacy and trustworthiness
3. Support for Decentralized Identifiers (DIDs)
4. Alignment with common assertion and achievement models
