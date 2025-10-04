<script lang="ts">
    import { onDestroy, onMount } from 'svelte';

    import WelcomeScreen from './welcome/WelcomeScreen.svelte';
    import LoadModal from './load/LoadModal.svelte';
    import SaveModal from './save/SaveModal.svelte';

    const { gameManager, imageAssetSets, eventEmitter, gameName } = $props();

    // State to control which modals are visible
    let modals = $state({
        welcome: true,
        load: false,
        save: false
    });

    function showModal(modalType: 'welcome' | 'load' | 'save') {
        if (modalType in modals) {
            modals[modalType] = true;
        }
    }

    function hideModal(modalType: 'welcome' | 'load' | 'save') {
        if (modalType in modals) {
            modals[modalType] = false;
        }
    }

    onMount(() => {
        eventEmitter.on('showModal', showModal);
        eventEmitter.on('hideModal', hideModal);
    });

    onDestroy(() => {
        eventEmitter.off('showModal', showModal);
        eventEmitter.off('hideModal', hideModal);
    });

</script>

{#if modals.welcome}
    <WelcomeScreen {gameManager} {imageAssetSets} {eventEmitter} hide={() => hideModal('welcome')} />
{/if}
{#if modals.load}
    <LoadModal {gameManager} {eventEmitter} hide={() => hideModal('load')} />
{/if}
{#if modals.save}
    <SaveModal {gameManager} {eventEmitter} {gameName} hide={() => hideModal('save')} />
{/if}