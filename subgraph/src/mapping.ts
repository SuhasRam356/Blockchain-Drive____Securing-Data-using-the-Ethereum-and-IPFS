import { BigInt, store } from "@graphprotocol/graph-ts"
import {
  FileAdded as FileAddedEvent,
  FileDeleted as FileDeletedEvent,
  FileUpdated as FileUpdatedEvent,
  AccessGranted as AccessGrantedEvent,
  AccessRevoked as AccessRevokedEvent,
  PublicKeyPublished as PublicKeyPublishedEvent
} from "../generated/UploadUpgradeableV6/UploadUpgradeableV6"
import { File, Access, UserMetric, ActivityEvent } from "../generated/schema"

function getOrCreateUserMetric(id: string): UserMetric {
  let userMetric = UserMetric.load(id)
  if (userMetric == null) {
    userMetric = new UserMetric(id)
    userMetric.totalFilesOwned = BigInt.fromI32(0)
    userMetric.save()
  }
  return userMetric as UserMetric
}

function createActivityEvent(id: string, user: string, type: string, text: string, timestamp: BigInt, txHash: string): void {
  let activity = new ActivityEvent(id)
  activity.user = import_crypto.Bytes.fromHexString(user) as import_crypto.Bytes // need actual Bytes conversion
  activity.type = type
  activity.text = text
  activity.timestamp = timestamp
  activity.txHash = import_crypto.Bytes.fromHexString(txHash) as import_crypto.Bytes
  activity.save()
}

export function handleFileAdded(event: FileAddedEvent): void {
  let fileId = event.params.url
  let file = new File(fileId)
  file.url = event.params.url
  file.category = event.params.category
  file.owner = event.params.user
  file.sender = event.params.sender
  file.timestamp = event.block.timestamp
  file.save()

  let userMetric = getOrCreateUserMetric(event.params.user.toHexString())
  userMetric.totalFilesOwned = userMetric.totalFilesOwned.plus(BigInt.fromI32(1))
  userMetric.save()

  let activity = new ActivityEvent(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())
  activity.user = event.params.user
  activity.type = "upload"
  activity.text = "Uploaded a new file"
  activity.timestamp = event.block.timestamp
  activity.txHash = event.transaction.hash
  activity.save()
}

export function handleFileDeleted(event: FileDeletedEvent): void {
  let fileId = event.params.url
  let file = File.load(fileId)
  if (file != null) {
    store.remove("File", fileId)
    
    let userMetric = getOrCreateUserMetric(event.params.user.toHexString())
    if (userMetric.totalFilesOwned.gt(BigInt.fromI32(0))) {
      userMetric.totalFilesOwned = userMetric.totalFilesOwned.minus(BigInt.fromI32(1))
      userMetric.save()
    }
  }

  let activity = new ActivityEvent(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())
  activity.user = event.params.user
  activity.type = "delete"
  activity.text = "Deleted a file"
  activity.timestamp = event.block.timestamp
  activity.txHash = event.transaction.hash
  activity.save()
}

export function handleFileUpdated(event: FileUpdatedEvent): void {
  let file = File.load(event.params.oldUrl)
  if (file != null) {
    let newFile = new File(event.params.newUrl)
    newFile.url = event.params.newUrl
    newFile.category = file.category
    newFile.owner = file.owner
    newFile.sender = file.sender
    newFile.timestamp = event.block.timestamp
    newFile.save()
    
    store.remove("File", event.params.oldUrl)
  }
}

export function handleAccessGranted(event: AccessGrantedEvent): void {
  let accessId = event.params.owner.toHexString() + "-" + event.params.user.toHexString()
  let access = new Access(accessId)
  access.owner = event.params.owner
  access.user = event.params.user
  access.durationInMinutes = event.params.durationInMinutes
  access.grantedAt = event.block.timestamp
  access.revokedAt = null
  access.save()

  let activity = new ActivityEvent(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())
  activity.user = event.params.owner
  activity.type = "grant"
  activity.text = "Granted access to " + event.params.user.toHexString().substring(0, 8) + "..."
  activity.timestamp = event.block.timestamp
  activity.txHash = event.transaction.hash
  activity.save()
}

export function handleAccessRevoked(event: AccessRevokedEvent): void {
  let accessId = event.params.owner.toHexString() + "-" + event.params.user.toHexString()
  let access = Access.load(accessId)
  if (access != null) {
    access.revokedAt = event.block.timestamp
    access.save()
  }

  let activity = new ActivityEvent(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())
  activity.user = event.params.owner
  activity.type = "revoke"
  activity.text = "Revoked access from " + event.params.user.toHexString().substring(0, 8) + "..."
  activity.timestamp = event.block.timestamp
  activity.txHash = event.transaction.hash
  activity.save()
}

export function handlePublicKeyPublished(event: PublicKeyPublishedEvent): void {
  let userMetric = getOrCreateUserMetric(event.params.user.toHexString())
  userMetric.publicKey = event.params.publicKey
  userMetric.save()
}
